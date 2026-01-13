import express from 'express';
import { query, run, get } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { isWithinWorkplace } from '../utils/location.js';

const router = express.Router();

// 출근 체크
router.post('/check-in', authenticate, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const userId = req.user.id;
    const workplaceId = req.user.workplace_id;

    if (!workplaceId) {
      return res.status(400).json({ message: '사업장이 지정되지 않았습니다.' });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ message: '위치 정보가 필요합니다.' });
    }

    // 사업장 정보 조회
    const workplace = await get(
      'SELECT * FROM workplaces WHERE id = ?',
      [workplaceId]
    );

    if (!workplace) {
      return res.status(404).json({ message: '사업장을 찾을 수 없습니다.' });
    }

    // 위치 확인
    const withinRange = isWithinWorkplace(
      latitude,
      longitude,
      workplace.latitude,
      workplace.longitude,
      workplace.radius
    );

    if (!withinRange) {
      return res.status(400).json({ 
        message: '사업장 범위 내에 있지 않습니다.',
        allowCheckIn: false
      });
    }

    // 오늘 날짜
    const today = new Date().toISOString().split('T')[0];

    // 이미 출근 체크했는지 확인
    const existingRecord = await get(
      'SELECT * FROM attendance WHERE user_id = ? AND date = ?',
      [userId, today]
    );

    if (existingRecord && existingRecord.check_in_time) {
      return res.status(400).json({ message: '이미 출근 체크하셨습니다.' });
    }

    // 출근 기록
    const now = new Date().toISOString();
    
    if (existingRecord) {
      await run(
        'UPDATE attendance SET check_in_time = ?, check_in_latitude = ?, check_in_longitude = ? WHERE id = ?',
        [now, latitude, longitude, existingRecord.id]
      );
    } else {
      await run(
        'INSERT INTO attendance (user_id, workplace_id, date, check_in_time, check_in_latitude, check_in_longitude) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, workplaceId, today, now, latitude, longitude]
      );
    }

    res.json({ 
      message: '출근이 기록되었습니다.',
      checkInTime: now
    });
  } catch (error) {
    console.error('출근 체크 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 퇴근 체크
router.post('/check-out', authenticate, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const userId = req.user.id;
    const workplaceId = req.user.workplace_id;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: '위치 정보가 필요합니다.' });
    }

    // 사업장 정보 조회
    const workplace = await get(
      'SELECT * FROM workplaces WHERE id = ?',
      [workplaceId]
    );

    if (!workplace) {
      return res.status(404).json({ message: '사업장을 찾을 수 없습니다.' });
    }

    // 위치 확인
    const withinRange = isWithinWorkplace(
      latitude,
      longitude,
      workplace.latitude,
      workplace.longitude,
      workplace.radius
    );

    if (!withinRange) {
      return res.status(400).json({ 
        message: '사업장 범위 내에 있지 않습니다.',
        allowCheckOut: false
      });
    }

    // 오늘 날짜
    const today = new Date().toISOString().split('T')[0];

    // 출근 기록 확인
    const existingRecord = await get(
      'SELECT * FROM attendance WHERE user_id = ? AND date = ?',
      [userId, today]
    );

    if (!existingRecord || !existingRecord.check_in_time) {
      return res.status(400).json({ message: '출근 기록이 없습니다.' });
    }

    if (existingRecord.check_out_time) {
      return res.status(400).json({ message: '이미 퇴근 체크하셨습니다.' });
    }

    // 근무 시간 계산
    const checkInTime = new Date(existingRecord.check_in_time);
    const checkOutTime = new Date();
    const workHours = (checkOutTime - checkInTime) / (1000 * 60 * 60); // 시간 단위

    // 퇴근 기록
    const now = new Date().toISOString();
    await run(
      'UPDATE attendance SET check_out_time = ?, check_out_latitude = ?, check_out_longitude = ?, work_hours = ?, status = ? WHERE id = ?',
      [now, latitude, longitude, workHours.toFixed(2), 'completed', existingRecord.id]
    );

    res.json({ 
      message: '퇴근이 기록되었습니다.',
      checkOutTime: now,
      workHours: workHours.toFixed(2)
    });
  } catch (error) {
    console.error('퇴근 체크 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 내 출퇴근 기록 조회
router.get('/my', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user.id;

    let sql = 'SELECT * FROM attendance WHERE user_id = ?';
    const params = [userId];

    if (startDate && endDate) {
      sql += ' AND date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    sql += ' ORDER BY date DESC, check_in_time DESC';

    const records = await query(sql, params);
    res.json(records);
  } catch (error) {
    console.error('출퇴근 기록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 오늘의 출퇴근 상태 조회
router.get('/today', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const record = await get(
      'SELECT * FROM attendance WHERE user_id = ? AND date = ?',
      [userId, today]
    );

    res.json({
      hasCheckedIn: record && record.check_in_time ? true : false,
      hasCheckedOut: record && record.check_out_time ? true : false,
      record: record || null
    });
  } catch (error) {
    console.error('출퇴근 상태 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 특정 직원의 출퇴근 기록 조회 (관리자/사업주)
router.get('/employee/:employeeId', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const employeeId = req.params.employeeId;

    // 권한 확인
    if (req.user.role === 'owner') {
      const employee = await get('SELECT workplace_id FROM users WHERE id = ?', [employeeId]);
      if (!employee) {
        return res.status(404).json({ message: '직원을 찾을 수 없습니다.' });
      }
      
      const workplace = await get('SELECT * FROM workplaces WHERE id = ?', [employee.workplace_id]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ message: '권한이 없습니다.' });
      }
    }

    let sql = 'SELECT * FROM attendance WHERE user_id = ?';
    const params = [employeeId];

    if (startDate && endDate) {
      sql += ' AND date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    sql += ' ORDER BY date DESC, check_in_time DESC';

    const records = await query(sql, params);
    res.json(records);
  } catch (error) {
    console.error('출퇴근 기록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사업장의 출퇴근 기록 조회 (관리자/사업주)
router.get('/workplace/:workplaceId', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const workplaceId = req.params.workplaceId;

    // 권한 확인
    if (req.user.role === 'owner') {
      const workplace = await get('SELECT * FROM workplaces WHERE id = ?', [workplaceId]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ message: '권한이 없습니다.' });
      }
    }

    let sql = `
      SELECT a.*, u.name as employee_name, u.username
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE a.workplace_id = ?
    `;
    const params = [workplaceId];

    if (startDate && endDate) {
      sql += ' AND a.date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    sql += ' ORDER BY a.date DESC, a.check_in_time DESC';

    const records = await query(sql, params);
    res.json(records);
  } catch (error) {
    console.error('출퇴근 기록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 출퇴근 기록 수정 (사업주만 가능)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const attendanceId = req.params.id;
    const { check_in_time, check_out_time } = req.body;

    // 사업주만 수정 가능
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: '권한이 없습니다. 사업주만 근무시간을 수정할 수 있습니다.' });
    }

    // 출퇴근 기록 조회
    const record = await get('SELECT * FROM attendance WHERE id = ?', [attendanceId]);
    if (!record) {
      return res.status(404).json({ message: '출퇴근 기록을 찾을 수 없습니다.' });
    }

    // 사업주 권한 확인
    if (req.user.role === 'owner') {
      const workplace = await get('SELECT * FROM workplaces WHERE id = ?', [record.workplace_id]);
      if (!workplace || workplace.owner_id !== req.user.id) {
        return res.status(403).json({ message: '권한이 없습니다.' });
      }
    }

    // 근무 시간 계산
    let workHours = null;
    let status = record.status;
    
    if (check_in_time && check_out_time) {
      const checkInTime = new Date(check_in_time);
      const checkOutTime = new Date(check_out_time);
      workHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
      status = 'completed';
    } else if (check_in_time && !check_out_time) {
      status = 'incomplete';
    }

    // 업데이트
    await run(
      'UPDATE attendance SET check_in_time = ?, check_out_time = ?, work_hours = ?, status = ? WHERE id = ?',
      [check_in_time, check_out_time, workHours ? workHours.toFixed(2) : null, status, attendanceId]
    );

    res.json({ 
      message: '출퇴근 기록이 수정되었습니다.',
      workHours: workHours ? workHours.toFixed(2) : null
    });
  } catch (error) {
    console.error('출퇴근 기록 수정 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
