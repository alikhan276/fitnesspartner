// Модель сообщения (PostgreSQL)
// Таблица создаётся автоматически в config/db.js

const { pool } = require('../config/db');

const Message = {
  // Получить диалог между двумя пользователями
  getDialog: async (userId1, userId2) => {
    const result = await pool.query(`
      SELECT m.*, u1.name as from_name, u2.name as to_name
      FROM messages m
      JOIN users u1 ON u1.id = m.from_user
      JOIN users u2 ON u2.id = m.to_user
      WHERE (m.from_user = $1 AND m.to_user = $2)
         OR (m.from_user = $2 AND m.to_user = $1)
      ORDER BY m.created_at ASC
    `, [userId1, userId2]);
    return result.rows;
  },

  // Создать сообщение
  create: async (fromUser, toUser, text) => {
    const result = await pool.query(
      `INSERT INTO messages (from_user, to_user, text) VALUES ($1,$2,$3) RETURNING *`,
      [fromUser, toUser, text]
    );
    return result.rows[0];
  },

  // Пометить как прочитанные
  markRead: async (fromUser, toUser) => {
    await pool.query(
      `UPDATE messages SET read=TRUE WHERE from_user=$1 AND to_user=$2 AND read=FALSE`,
      [fromUser, toUser]
    );
  },

  // Получить все чаты пользователя
  getChats: async (userId) => {
    const result = await pool.query(`
      SELECT DISTINCT ON (other_id)
        other_id, other_name, last_text, last_time, unread_count
      FROM (
        SELECT
          CASE WHEN m.from_user=$1 THEN m.to_user ELSE m.from_user END AS other_id,
          CASE WHEN m.from_user=$1 THEN u2.name ELSE u1.name END AS other_name,
          m.text AS last_text,
          m.created_at AS last_time,
          (SELECT COUNT(*) FROM messages
           WHERE from_user != $1 AND to_user=$1 AND read=FALSE
           AND from_user=CASE WHEN m.from_user=$1 THEN m.to_user ELSE m.from_user END
          ) AS unread_count
        FROM messages m
        JOIN users u1 ON u1.id=m.from_user
        JOIN users u2 ON u2.id=m.to_user
        WHERE m.from_user=$1 OR m.to_user=$1
        ORDER BY m.created_at DESC
      ) sub
      ORDER BY other_id, last_time DESC
    `, [userId]);
    return result.rows;
  }
};

module.exports = Message;