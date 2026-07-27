module.exports = {
  beginner: {
    pattern: "reflected",
    complexity: "single input, single page, obvious source-to-sink",
    defaultPayload: "<script>alert('xss')</script>",
    learningObjectives: [
      "Identify reflected user input in an HTML response",
      "Exploit reflected XSS with a simple script payload",
      "Fix the issue using output encoding"
    ]
  },

intermediate: {
    pattern: "dom",
    complexity: "client-side JavaScript reads user input and writes it into the DOM unsafely",
    defaultPayload: "<img src=x onerror=alert('xss')>",
    learningObjectives: [
      "Trace user input from form submission to preview rendering",
      "Exploit XSS using an HTML event-handler payload",
      "Fix the issue by escaping rendered preview content"
    ]
  },

advanced: {
    pattern: "stored",
    complexity: "stored input, multiple users/pages, persistent execution",
    defaultPayload: "<script>alert('stored-xss')</script>",
    learningObjectives: [
      "Identify stored user input rendered later",
      "Exploit persistent XSS across requests",
      "Fix the issue using safe output encoding and validation"
    ]
  }
};
