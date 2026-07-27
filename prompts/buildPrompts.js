function buildLabPrompt(request) {
  return `
You are generating a CANDIDATE secure-coding lab for a controlled educational platform.

The admin request is:

${JSON.stringify(request, null, 2)}

Return ONLY valid JSON.
Do not include markdown.
Do not include comments outside JSON.

You must generate:

1. Vulnerable source code
2. Secure fixed source code
3. Functional tests
4. Security payloads
5. Expected vulnerable behavior
6. Expected fixed behavior

Rules:
- The lab must be beginner-friendly if difficulty is Beginner.
- The vulnerable code must demonstrate the requested vulnerability.
- The solution must fix the vulnerability without removing the feature.
- If Node.js is used, the app must support process.env.PORT.
- Do not hardcode port 3001.
- Do not use destructive commands.
- Do not include malware.
- Do not include reverse shells.
- Do not include credential theft.
- Do not target real third-party systems.
- All payloads must be for the generated local lab only.
`;
}

module.exports = {
  buildLabPrompt
};
