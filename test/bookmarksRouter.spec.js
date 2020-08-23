const knex = require('knex');
const supertest = require('supertest');

const app = require('../src/app');
const { makeBookmarksArray, makeMaliciousBookmark } = require('./bookmarks.fixtures');
const { expect } = require('chai');


describe('Bookmarks Endpoints', () => {
  let db;
  before('Make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    });
    app.set('db', db);
  });

  before('Clean the table', () => db('bookmarks').truncate());
  afterEach(() => db('bookmarks').truncate());

  after('Clean up', () => db.destroy());

  describe(`Unauthorized requests`, () => {
    const testBookmarks = makeBookmarksArray()

    beforeEach('insert bookmarks', () => {
      return db
        .into('bookmarks')
        .insert(testBookmarks)
    })

    it(`responds with 401 Unauthorized for GET /bookmarks`, () => {
      return supertest(app)
        .get('/bookmarks')
        .expect(401, { error: 'Unauthorized request' })
    })

    it(`responds with 401 Unauthorized for POST /bookmarks`, () => {
      return supertest(app)
        .post('/bookmarks')
        .send({ title: 'test-title', url: 'http://some.thing.com', rating: 1 })
        .expect(401, { error: 'Unauthorized request' })
    })

    it(`responds with 401 Unauthorized for GET /bookmarks/:id`, () => {
      const secondBookmark = testBookmarks[1]
      return supertest(app)
        .get(`/bookmarks/${secondBookmark.id}`)
        .expect(401, { error: 'Unauthorized request' })
    })

    it(`responds with 401 Unauthorized for DELETE /bookmarks/:id`, () => {
      const aBookmark = testBookmarks[1]
      return supertest(app)
        .delete(`/bookmarks/${aBookmark.id}`)
        .expect(401, { error: 'Unauthorized request' })
    })
  })

  context('Given "bookmarks" has no data', () => {
    it('Get /bookmarks should return an empty array', () => {
      return supertest(app)
        .get('/api/bookmarks')
        .set({ Authorization: `Bearer ${process.env.API_TOKEN}` })
        .expect(200, []);
    });

    it('Get /bookmarks/:id should return 404', () => {
      return supertest(app)
        .get('/api/bookmarks/1')
        .set({ Authorization: `Bearer ${process.env.API_TOKEN}` })
        .expect(404, { 
          error: {message: 'Bookmark Not Found'}
        });
    });
    it('POST /bookmarks inserts a new bookmark into the table', () => {
      const newBookmark = {
        title: 'test-title',
        url: 'https://www.test.com',
        description: 'test description',
        rating: 1
      }
      return supertest(app)
        .post('/api/bookmarks')
        .send(newBookmark)
        .set({ Authorization: `Bearer ${process.env.API_TOKEN}`})
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newBookmark.title)
          expect(res.body.url).to.eql(newBookmark.url)
          expect(res.body.description).to.eql(newBookmark.description)
          expect(res.body.rating).to.eql(newBookmark.rating)
          expect(res.body).to.have.property('id')
          expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`)
        })
        .then(res =>
          supertest(app)
            .get(`/api/bookmarks/${res.body.id}`)
            .set({ Authorization: `Bearer ${process.env.API_TOKEN}`})
            .expect(res.body)  
        )
    })
    it(`POST /bookmarks responds with 400 missing 'title' if not supplied`, () => {
      const newBookmarkMissingTitle = {
        // title: 'test-title',
        url: 'https://test.com',
        rating: 1,
      }
      return supertest(app)
        .post(`/api/bookmarks`)
        .send(newBookmarkMissingTitle)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(400, {
          error: { message: `'title' is required` }
        })
    })

    it(`POST /bookmarks responds with 400 missing 'url' if not supplied`, () => {
      const newBookmarkMissingUrl = {
        title: 'test-title',
        // url: 'https://test.com',
        rating: 1,
      }
      return supertest(app)
        .post(`/api/bookmarks`)
        .send(newBookmarkMissingUrl)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(400, {
          error: { message: `'url' is required` }
        })
    })

    it(`POST /bookmarks responds with 400 missing 'rating' if not supplied`, () => {
      const newBookmarkMissingRating = {
        title: 'test-title',
        url: 'https://test.com',
        // rating: 1,
      }
      return supertest(app)
        .post(`/api/bookmarks`)
        .send(newBookmarkMissingRating)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(400, {
          error: { message: `'rating' is required` }
        })
    })

    it(`POST /bookmarks responds with 400 invalid 'rating' if not between 0 and 5`, () => {
      const newBookmarkInvalidRating = {
        title: 'test-title',
        url: 'https://test.com',
        rating: 'invalid',
      }
      return supertest(app)
        .post(`/api/bookmarks`)
        .send(newBookmarkInvalidRating)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(400, {
          error: { message: `'rating' must be a number between 0 and 5` }
        })
    })

    it(`POST /bookmarks responds with 400 invalid 'url' if not a valid URL`, () => {
      const newBookmarkInvalidUrl = {
        title: 'test-title',
        url: 'htp://invalid-url',
        rating: 1,
      }
      return supertest(app)
        .post(`/api/bookmarks`)
        .send(newBookmarkInvalidUrl)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(400, {
          error: { message: `'url' must be a valid URL` }
        })
    })
    it('POST Removes XSS attack content from response', () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()
      return supertest(app)
        .post('/api/bookmarks')
        .send(maliciousBookmark)
        .set({ Authorization: `Bearer ${process.env.API_TOKEN}`})
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(expectedBookmark.title)
          expect(res.body.description).to.eql(expectedBookmark.description)
        })
    })
    it('DELETE /bookmarks responds 404 when bookmark doesn\'t exist', () => {
      return supertest(app)
        .delete('/api/bookmarks/123')
        .set({ Authorization: `Bearer ${process.env.API_TOKEN}`})
        .expect(404, {
          error: { message: 'Bookmark Not Found'}
        })
    })
    it('PATCH /api/bookmarks/:id responds 404 if bookmark doesn\'t exist', () => {
      const id = 123456
      return supertest(app)
        .patch(`/api/bookmarks/${id}`)
        .set({ Authorization: `Bearer ${process.env.API_TOKEN}`})
        .expect(404, {
          error: { message: 'Bookmark Not Found'}
        })
    })

  });

  context('Given "bookmarks" has data in the table', () => {
    const testBookmarks = makeBookmarksArray();

    beforeEach(() => db('bookmarks').insert(testBookmarks));

    it('GET /bookmarks returns 200 status and all bookmarks', () => {
      return supertest(app)
        .get('/api/bookmarks')
        .set({ Authorization: `Bearer ${process.env.API_TOKEN}` })
        .expect(200, testBookmarks);
    });

    it('Get /bookmarks/:id should return first bookmark', () => {
      const id = 1;
      return supertest(app)
        .get(`/api/bookmarks/${id}`)
        .set({ Authorization: `Bearer ${process.env.API_TOKEN}`})
        .expect(200, testBookmarks[id - 1])
    });
    it('DELETE /bookmarks removes the bookmark by ID from the table', () => {
      const idToRemove = 2
      const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove)
      return supertest(app)
        .delete(`/api/bookmarks/${idToRemove}`)
        .set({ Authorization: `Bearer ${process.env.API_TOKEN}`})
        .expect(204)
        .then(() => 
          supertest(app)
            .get('/api/bookmarks')
            .set({ Authorization: `Bearer ${process.env.API_TOKEN}`})
            .expect(expectedBookmarks)
        )
    })
    it('PATCH responds with 400 if no required information is sent', () => {
      const idToUpdate = 2
      return supertest(app)
        .patch(`/api/bookmarks/${idToUpdate}`)
        .set({ Authorization: `Bearer ${process.env.API_TOKEN}`})
        .send({ irrelevantField: 'foo' })
        .expect(400, {
          error: { message: 'Request body must contain either \'title\', \'url\', \'description\', or \'rating\'' }
        })
    })
    it('PATCH /bookmarks responds with 204 and updates bookmark', () => {
      const idToUpdate = 2
      const updateBookmark = {
        title: 'E-Bay',
        url: 'http://www.ebay.com',
        description: 'Scams galore',
        rating: 1
      }
      const expectedBookmark = {
        ...testBookmarks[idToUpdate - 1],
        ...updateBookmark
      }
      return supertest(app)
        .patch(`/api/bookmarks/${idToUpdate}`)
        .set({ Authorization: `Bearer ${process.env.API_TOKEN}`})
        .send(updateBookmark)
        .expect(204)
        .then(res =>
          supertest(app)
            .get(`/api/bookmarks/${idToUpdate}`)
            .set({ Authorization: `Bearer ${process.env.API_TOKEN}`})
            .expect(expectedBookmark)  
        )
    })
    it('PATCH /bookmarks responds 204 when given a subset of fields to update', () => {
      const idToUpdate = 2
      const updateBookmark = {
        title: 'E-Bay',
        url: 'http://www.ebay.com',
      }
      const expectedBookmark = {
        ...testBookmarks[idToUpdate - 1],
        ...updateBookmark
      }
      return supertest(app)
        .patch(`/api/bookmarks/${idToUpdate}`)
        .set({ Authorization: `Bearer ${process.env.API_TOKEN}`})
        .send(updateBookmark)
        .expect(204)
        .then(res =>
          supertest(app)
            .get(`/api/bookmarks/${idToUpdate}`)
            .set({ Authorization: `Bearer ${process.env.API_TOKEN}`})
            .expect(expectedBookmark)  
        )
    })
  });
});
