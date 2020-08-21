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
};

module.exports = BookmarksService;
