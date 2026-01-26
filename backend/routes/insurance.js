import express from 'express';
import { query, get, run } from '../config/database.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// 현재 적용되는 보험 요율 조회 (모든 인증된 사용자)
router.get('/rates/current', authenticate, async (req, res) => {
  try {
    const currentDate = new Date().toISOString().split('T')[0];
    
    const rates = await get(`
      SELECT * FROM insurance_rates 
      WHERE effective_from <= ? 
        AND (effective_to IS NULL OR effective_to >= ?)
      ORDER BY effective_from DESC
      LIMIT 1
    `, [currentDate, currentDate]);

    if (!rates) {
      // 현재 연도 기본 요율 반환
      const currentYear = new Date().getFullYear();
      const yearRates = await get(`
        SELECT * FROM insurance_rates 
        WHERE year = ?
        ORDER BY effective_from DESC
        LIMIT 1
      `, [currentYear]);
      
      if (!yearRates) {
        return res.status(404).json({ 
          message: '적용 가능한 보험 요율이 없습니다.' 
        });
      }
      
      return res.json(yearRates);
    }

    res.json(rates);
  } catch (error) {
    console.error('보험 요율 조회 오류:', error);
    res.status(500).json({ message: '보험 요율 조회 중 오류가 발생했습니다.' });
  }
});

// 특정 연도의 보험 요율 조회
router.get('/rates/year/:year', authenticate, async (req, res) => {
  try {
    const { year } = req.params;
    
    const rates = await query(`
      SELECT * FROM insurance_rates 
      WHERE year = ?
      ORDER BY effective_from DESC
    `, [parseInt(year)]);

    res.json(rates);
  } catch (error) {
    console.error('연도별 보험 요율 조회 오류:', error);
    res.status(500).json({ message: '보험 요율 조회 중 오류가 발생했습니다.' });
  }
});

// 모든 보험 요율 이력 조회 (관리자만)
router.get('/rates/all', authenticate, authorizeRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const allRates = await query(`
      SELECT * FROM insurance_rates 
      ORDER BY year DESC, effective_from DESC
    `);

    res.json(allRates);
  } catch (error) {
    console.error('보험 요율 이력 조회 오류:', error);
    res.status(500).json({ message: '보험 요율 조회 중 오류가 발생했습니다.' });
  }
});

// 보험 요율 생성 (관리자만)
router.post('/rates', authenticate, authorizeRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const {
      year,
      national_pension_rate,
      national_pension_min,
      national_pension_max,
      health_insurance_rate,
      health_insurance_min,
      health_insurance_max,
      long_term_care_rate,
      employment_insurance_rate,
      effective_from,
      effective_to,
      notes
    } = req.body;

    // 필수 필드 검증
    if (!year || !national_pension_rate || !health_insurance_rate || 
        !long_term_care_rate || !employment_insurance_rate || !effective_from) {
      return res.status(400).json({ 
        message: '필수 항목을 모두 입력해주세요.' 
      });
    }

    // 중복 체크
    const existing = await get(`
      SELECT * FROM insurance_rates 
      WHERE year = ? AND effective_from = ?
    `, [year, effective_from]);

    if (existing) {
      return res.status(400).json({ 
        message: '해당 연도 및 적용일의 보험 요율이 이미 존재합니다.' 
      });
    }

    // 요율 생성
    const result = await run(`
      INSERT INTO insurance_rates 
      (year, national_pension_rate, national_pension_min, national_pension_max,
       health_insurance_rate, health_insurance_min, health_insurance_max,
       long_term_care_rate, employment_insurance_rate,
       effective_from, effective_to, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      year,
      national_pension_rate,
      national_pension_min || 0,
      national_pension_max || 0,
      health_insurance_rate,
      health_insurance_min || 0,
      health_insurance_max || 0,
      long_term_care_rate,
      employment_insurance_rate,
      effective_from,
      effective_to || null,
      notes || null
    ]);

    res.status(201).json({ 
      message: '보험 요율이 등록되었습니다.',
      id: result.id 
    });
  } catch (error) {
    console.error('보험 요율 생성 오류:', error);
    res.status(500).json({ message: '보험 요율 생성 중 오류가 발생했습니다.' });
  }
});

// 보험 요율 수정 (관리자만)
router.put('/rates/:id', authenticate, authorizeRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      year,
      national_pension_rate,
      national_pension_min,
      national_pension_max,
      health_insurance_rate,
      health_insurance_min,
      health_insurance_max,
      long_term_care_rate,
      employment_insurance_rate,
      effective_from,
      effective_to,
      notes
    } = req.body;

    // 요율 존재 확인
    const existing = await get('SELECT * FROM insurance_rates WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ message: '해당 보험 요율을 찾을 수 없습니다.' });
    }

    // 요율 업데이트
    await run(`
      UPDATE insurance_rates SET
        year = ?,
        national_pension_rate = ?,
        national_pension_min = ?,
        national_pension_max = ?,
        health_insurance_rate = ?,
        health_insurance_min = ?,
        health_insurance_max = ?,
        long_term_care_rate = ?,
        employment_insurance_rate = ?,
        effective_from = ?,
        effective_to = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      year,
      national_pension_rate,
      national_pension_min || 0,
      national_pension_max || 0,
      health_insurance_rate,
      health_insurance_min || 0,
      health_insurance_max || 0,
      long_term_care_rate,
      employment_insurance_rate,
      effective_from,
      effective_to || null,
      notes || null,
      id
    ]);

    res.json({ message: '보험 요율이 수정되었습니다.' });
  } catch (error) {
    console.error('보험 요율 수정 오류:', error);
    res.status(500).json({ message: '보험 요율 수정 중 오류가 발생했습니다.' });
  }
});

// 보험 요율 삭제 (관리자만)
router.delete('/rates/:id', authenticate, authorizeRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // 요율 존재 확인
    const existing = await get('SELECT * FROM insurance_rates WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ message: '해당 보험 요율을 찾을 수 없습니다.' });
    }

    // 요율 삭제
    await run('DELETE FROM insurance_rates WHERE id = ?', [id]);

    res.json({ message: '보험 요율이 삭제되었습니다.' });
  } catch (error) {
    console.error('보험 요율 삭제 오류:', error);
    res.status(500).json({ message: '보험 요율 삭제 중 오류가 발생했습니다.' });
  }
});

export default router;
