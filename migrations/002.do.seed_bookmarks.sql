BEGIN;

INSERT INTO bookmarks (title, url, description, rating)
  VALUES
    ('Google', 'http://www.google.com', 'Search engine', 5),
    ('Amazon', 'http://www.amazon.com', 'E-Commerce', 4),
    ('YouTube', 'http://www.youtube.com', 'Time waster', 5);

COMMIT;