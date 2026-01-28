import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/rates-master?yyyymm=202601
 * 특정 귀속월에 적용될 요율 조회
 * effective_yyyymm <= yyyymm 중 가장 최신 1개
 * Public API - 급여 계산 시 사용
 */
router.get('/', async (req, res) => {
  try {
    const { yyyymm } = req.query;
    
    if (!yyyymm || !/^\d{6}$/.test(yyyymm)) {
      return res.status(400).json({ message: 'Invalid yyyymm format. Expected: YYYYMM (e.g. 202601)' });
    }
    
    const sql = `
      SELECT *
      FROM rates_master
      WHERE effective_yyyymm <= $1
      ORDER BY effective_yyyymm DESC
      LIMIT 1
    `;
    
    const rows = await query(sql, [yyyymm]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No applicable rate found for the given period' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching rates:', error);
    res.status(500).json({ message: 'Failed to fetch rates', error: error.message });
  }
});

router.get('/list', async (req, res) => {
  console.log('📋 GET /api/rates-master/list - Public access');

  try {
    const rows = await query(
      'SELECT * FROM rates_master ORDER BY effective_yyyymm DESC'
    );

    console.log(`✅ Fetched ${rows.length} rates from rates_master`);
    return res.json(rows);
  } catch (err) {
    console.error('❌ rates-master list error:', err);
    return res.status(500).json({
      message: 'Failed to fetch rates list',
      error: err?.message || String(err),
    });
  }
});

/**
 * POST /api/rates-master
 * 요율 등록 또는 수정 (UPSERT)
 * SUPER_ADMIN만 가능
 */
router.post('/', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    console.log('📋 POST /api/rates-master 요청 수신');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user?.username, 'Role:', req.user?.role);
    
    const {
      effective_yyyymm,
      nps_employee_rate_percent,
      nhis_employee_rate_percent,
      ltci_rate_of_nhis_percent,
      ei_employee_rate_percent,
      freelancer_withholding_rate_percent,
      nps_employer_rate_percent,
      nhis_employer_rate_percent,
      ei_employer_rate_percent,
      nps_min_amount,
      nps_max_amount,
      nhis_min_amount,
      nhis_max_amount,
      memo
    } = req.body;
    
    // 필수 필드 검증
    if (!effective_yyyymm || !/^\d{6}$/.test(effective_yyyymm)) {
      console.error('❌ Validation failed: Invalid effective_yyyymm format');
      return res.status(400).json({ message: '적용 시작월이 올바르지 않습니다. YYYYMM 형식으로 입력해주세요 (예: 202601)' });
    }
    
    if (
      nps_employee_rate_percent === undefined ||
      nhis_employee_rate_percent === undefined ||
      ltci_rate_of_nhis_percent === undefined ||
      ei_employee_rate_percent === undefined ||
      freelancer_withholding_rate_percent === undefined
    ) {
      console.error('❌ Validation failed: Missing required rate fields');
      return res.status(400).json({ message: '필수 요율 필드가 누락되었습니다' });
    }
    
    const sql = `
      INSERT INTO rates_master (
        effective_yyyymm,
        nps_employee_rate_percent,
        nhis_employee_rate_percent,
        ltci_rate_of_nhis_percent,
        ei_employee_rate_percent,
        freelancer_withholding_rate_percent,
        nps_employer_rate_percent,
        nhis_employer_rate_percent,
        ei_employer_rate_percent,
        nps_min_amount,
        nps_max_amount,
        nhis_min_amount,
        nhis_max_amount,
        memo,
        created_by,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
      ON CONFLICT (effective_yyyymm)
      DO UPDATE SET
        nps_employee_rate_percent = EXCLUDED.nps_employee_rate_percent,
        nhis_employee_rate_percent = EXCLUDED.nhis_employee_rate_percent,
        ltci_rate_of_nhis_percent = EXCLUDED.ltci_rate_of_nhis_percent,
        ei_employee_rate_percent = EXCLUDED.ei_employee_rate_percent,
        freelancer_withholding_rate_percent = EXCLUDED.freelancer_withholding_rate_percent,
        nps_employer_rate_percent = EXCLUDED.nps_employer_rate_percent,
        nhis_employer_rate_percent = EXCLUDED.nhis_employer_rate_percent,
        ei_employer_rate_percent = EXCLUDED.ei_employer_rate_percent,
        nps_min_amount = EXCLUDED.nps_min_amount,
        nps_max_amount = EXCLUDED.nps_max_amount,
        nhis_min_amount = EXCLUDED.nhis_min_amount,
        nhis_max_amount = EXCLUDED.nhis_max_amount,
        memo = EXCLUDED.memo,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const values = [
      effective_yyyymm,
      nps_employee_rate_percent,
      nhis_employee_rate_percent,
      ltci_rate_of_nhis_percent,
      ei_employee_rate_percent,
      freelancer_withholding_rate_percent,
      nps_employer_rate_percent || 4.5,
      nhis_employer_rate_percent || 3.545,
      ei_employer_rate_percent || 1.15,
      nps_min_amount || 0,
      nps_max_amount || 0,
      nhis_min_amount || 0,
      nhis_max_amount || 0,
      memo || '',
      req.user.id
    ];
    
    console.log('💾 Executing query with values:', values);
    
    const rows = await query(sql, values);
    const savedRate = rows[0] || null;
    
    console.log('✅ Rate saved successfully:', savedRate);
    res.status(201).json(savedRate);
  } catch (error) {
    console.error('❌ Error saving rates:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // 상세한 에러 메시지 전달
    let userMessage = '요율 저장에 실패했습니다';
    if (error.message.includes('duplicate') || error.message.includes('UNIQUE')) {
      userMessage = '이미 존재하는 적용월입니다. 수정하려면 기존 데이터를 삭제 후 다시 등록하거나, 수정 버튼을 이용해주세요.';
    } else if (error.message.includes('relation') || error.message.includes('does not exist')) {
      userMessage = 'rates_master 테이블이 존재하지 않습니다. 관리자에게 문의하세요.';
    } else if (error.message.includes('foreign key') || error.message.includes('violates')) {
      userMessage = '사용자 정보가 올바르지 않습니다.';
    }
    
    res.status(500).json({ 
      message: userMessage,
      detail: error.message,
      code: error.code
    });
  }
});

/**
 * DELETE /api/rates-master/:effective_yyyymm
 * 요율 삭제
 * SUPER_ADMIN만 가능
 */
router.delete('/:effective_yyyymm', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const { effective_yyyymm } = req.params;
    
    if (!/^\d{6}$/.test(effective_yyyymm)) {
      return res.status(400).json({ message: 'Invalid effective_yyyymm format' });
    }
    
    const sql = 'DELETE FROM rates_master WHERE effective_yyyymm = $1 RETURNING *';
    const rows = await query(sql, [effective_yyyymm]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Rate not found' });
    }
    
    res.json({ message: 'Rate deleted successfully', deleted: rows[0] });
  } catch (error) {
    console.error('Error deleting rate:', error);
    res.status(500).json({ message: 'Failed to delete rate', error: error.message });
  }
});

export default router;
