const sanitize = (v) => {
  if (v && typeof v === 'object') {
    for (const key in v) {
      if (key.startsWith('$') || key.includes('.')) {
        delete v[key];
      } else {
        sanitize(v[key]);
      }
    }
  }
};

export const mongoSanitize = (req, res, next) => {
  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  next();
};
