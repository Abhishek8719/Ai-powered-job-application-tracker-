import { Router } from 'express'
import { pool } from '../db'

export const dashboardRouter = Router()

dashboardRouter.get('/', async (req, res) => {
  const userId = req.userId!

  const [[totals]] = await pool.query<any[]>(
    `SELECT
      COUNT(*) AS totalApplications,
      SUM(status = 'Interviewing') AS interviewsScheduled,
      SUM(status = 'Offer') AS offersReceived,
      SUM(status = 'Rejected') AS rejected
    FROM applications
    WHERE user_id = ?`,
    [userId]
  )

  const totalApplications = Number(totals?.totalApplications ?? 0)
  const rejected = Number(totals?.rejected ?? 0)
  const rejectionRate = totalApplications === 0 ? 0 : Math.round((rejected / totalApplications) * 100)

  const [statusRows] = await pool.query<any[]>(
    `SELECT status, COUNT(*) AS count
     FROM applications
     WHERE user_id = ?
     GROUP BY status`,
    [userId]
  )

  const [recentRows] = await pool.query<any[]>(
    `SELECT company, role, DATE_FORMAT(date_applied, '%Y-%m-%d') AS dateApplied, status
     FROM applications
     WHERE user_id = ?
     ORDER BY date_applied DESC
     LIMIT 5`,
    [userId]
  )

  const [timeRows] = await pool.query<any[]>(
    `SELECT
      DATE_FORMAT(date_applied, '%Y-%m-%d') AS day,
      COUNT(*) AS applications,
      SUM(status = 'Interviewing' OR status = 'Offer') AS interviews
     FROM applications
     WHERE user_id = ?
     GROUP BY day
     ORDER BY day ASC`,
    [userId]
  )

  return res.json({
    stats: {
      totalApplications,
      interviewsScheduled: Number(totals?.interviewsScheduled ?? 0),
      offersReceived: Number(totals?.offersReceived ?? 0),
      rejectionRate
    },
    statusDistribution: statusRows,
    overviewSeries: timeRows,
    recent: recentRows
  })
})
