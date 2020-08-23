const BookmarksService = {
  getAllBookmarks(knex) {
    return knex('bookmarks').select('*');
  },

  getBookmark(knex, id) {
    return knex('bookmarks').select('*').where({ id }).first();
  },

  insertBookmark(knex, newBookmark) {
    return knex 
      .insert(newBookmark)
      .into('bookmarks')
      .returning('*')
      .then(rows => {
        return rows[0]
      })
  },

  deleteBookmark(knex, id) {
    return knex('bookmarks')
      .where({ id })
      .delete()
  },

  updateBookmark(knex, id, data) {
    return knex('bookmarks')
      .where({ id })
      .update(data)
  }
};

module.exports = BookmarksService;
