const express = require('express');
const xss = require('xss')
const isUrl = require('is-valid-http-url');

//const bookmarks = require('./bookmarkStore');
const logger = require('../logger.js');
const BookmarksService = require('./BookmarksService');

const bookmarksRouter = express.Router();
const bodyParser = express.json();

const sanitizeBookmark = bookmark => ({
  id: bookmark.id,
  title: xss(bookmark.title),
  url: bookmark.url,
  description: xss(bookmark.description),
  rating: Number(bookmark.rating)
})


bookmarksRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');
    BookmarksService.getAllBookmarks(knexInstance)
      .then((bookmarks) => res.status(200).json(bookmarks))
      .catch(next);
  })
  .post(bodyParser, (req, res, next) => {

    for(const field of ['title', 'url', 'rating']) {
      if(!req.body[field]) {
        logger.error(`${field} is required`)
        return res.status(400).send({
          error: { message: `'${field}' is required`}
        })
      }
    }

    const { title, url, description, rating } = req.body;
    const ratingNum = Number(rating);

    if (!Number.isInteger(ratingNum) || ratingNum < 0 || ratingNum > 5) {
      logger.error(`Invalid rating '${rating}' supplied`);
      return res.status(400).send({ 
        error: { message: "'rating' must be a number between 0 and 5" } 
      });
    }
    if (!isUrl(url)) {
      logger.error(`Invalid url '${url}' supplied`);
      return res.status(400).send({
        error: { message: "'url' must be a valid URL" }
      });
    }

    
    const newBookmark = {
      title,
      url,
      description,
      rating,
    };

    BookmarksService.insertBookmark(req.app.get('db'), newBookmark)
      .then(bookmark => {
        logger.info(`Bookmark with id ${bookmark.id} created`)
        res 
          .status(201)
          .location(`/api/bookmarks/${bookmark.id}`)
          .json(sanitizeBookmark(bookmark))
      })
      .catch(next)
  });

bookmarksRouter
  .route('/:id')
  .all((req, res, next) => {
    const { id } = req.params
    BookmarksService.getBookmark(req.app.get('db'), id)
      .then(bookmark => {
        if(!bookmark) {
          logger.error(`Bookmark with id ${id} not found`)
          return res.status(404).json({
            error: { message: 'Bookmark Not Found' }
          })
        }
        res.bookmark = bookmark
        next()
      })
      .catch(next)
  })
  .get((req, res) => {
    res.status(200).json(sanitizeBookmark(res.bookmark));
  })
  .delete((req, res, next) => {
    const { id } = req.params;
    BookmarksService.deleteBookmark(req.app.get('db'), id)
      .then(() => {
        logger.info(`Bookmark with id ${id} deleted`)
        res.status(204).end()
      })
      .catch(next)
  })
  .patch(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body
    const articleToUpdate = { title, url, description, rating }

    if(!req.params.id) {
      return res.status(400).json({
        error: { message: 'Must provide id of bookmark to update'}
      })
    }
    
    const numberOfValues = Object.values(articleToUpdate).filter(Boolean).length
    if(numberOfValues === 0) {
      return res.status(400).json({
        error: { message: 'Request body must contain either \'title\', \'url\', \'description\', or \'rating\''}
      })
    }
    BookmarksService.updateBookmark(req.app.get('db'), req.params.id, articleToUpdate)
      .then(numRowsAffected => {
        res.status(204).end()
      })
      .catch(next)

  })

module.exports = bookmarksRouter;
