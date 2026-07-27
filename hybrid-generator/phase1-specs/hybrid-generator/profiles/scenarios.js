module.exports = {
  sports_store: {
    name: "Sportswear Store",
    sector: "E-Commerce",
    routes: {
      beginner: [
        "GET /",
        "GET /search",
        "GET /health"
      ],
      intermediate: [
        "GET /",
        "GET /product",
        "GET /health"
      ],
      advanced: [
        "GET /products/:id",
        "POST /products/:id/reviews",
        "GET /health"
      ]
    }
  },

  university_portal: {
    name: "University Portal",
    sector: "Education",
    routes: {
      beginner: [
        "GET /",
        "GET /courses",
        "GET /health"
      ],
      intermediate: [
        "GET /",
        "GET /announcement",
        "GET /health"
      ],
      advanced: [
        "GET /announcements/:id",
        "POST /announcements/:id/comments",
        "GET /health"
      ]
    }
  },

  government_complaints: {
    name: "Government Complaints Portal",
    sector: "Government",
    routes: {
      beginner: [
        "GET /",
        "GET /lookup",
        "GET /health"
      ],
      intermediate: [
        "GET /",
        "GET /preview",
        "GET /health"
      ],
      advanced: [
        "GET /complaints/:id",
        "POST /complaints/:id/replies",
        "GET /health"
      ]
    }
  }
};
