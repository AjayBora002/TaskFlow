let GoogleGenAIClass = null;

const getGenAI = async () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) return null;

  try {
    if (!GoogleGenAIClass) {
      const mod = await import('@google/genai');
      GoogleGenAIClass = mod.GoogleGenAI || mod.default?.GoogleGenAI;
    }
    if (GoogleGenAIClass) {
      return new GoogleGenAIClass({ apiKey });
    }
  } catch (e) {
    console.warn('Dynamic import of @google/genai failed or unsupported:', e.message);
  }
  return null;
};

// 1. Task Auto-Decomposer (Subtasks)
exports.decomposeTask = async (title, description) => {
  const ai = await getGenAI();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an expert technical project manager. Break down the following software engineering task into 4 to 6 specific, actionable, bite-sized subtasks.
Task Title: ${title}
Task Description: ${description || 'No description provided.'}

Return ONLY a JSON array of strings, for example: ["Subtask 1", "Subtask 2", "Subtask 3", "Subtask 4"]. Do not wrap in markdown code blocks or add any other text.`,
      });
      const text = response.text.trim().replace(/^```json/, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((t) => ({ title: t, completed: false }));
      }
    } catch (e) {
      console.warn('Gemini API call failed, falling back to smart heuristic:', e.message);
    }
  }

  // Fallback heuristics based on title keywords
  const titleLower = title.toLowerCase();
  let subtasks = [];

  if (titleLower.includes('auth') || titleLower.includes('login') || titleLower.includes('jwt')) {
    subtasks = [
      'Design JWT token expiration & refresh token flow',
      'Implement password hashing with bcrypt cost factor 12',
      'Add login / register API endpoints & validation',
      'Write auth context and token interceptor on frontend',
    ];
  } else if (titleLower.includes('api') || titleLower.includes('endpoint') || titleLower.includes('backend')) {
    subtasks = [
      'Define request schema validation & error handlers',
      'Implement database query & controller logic',
      'Add authentication middleware check',
      'Write integration unit tests for endpoint',
    ];
  } else if (titleLower.includes('ui') || titleLower.includes('design') || titleLower.includes('component')) {
    subtasks = [
      'Create component layout & responsive CSS styles',
      'Wire component to state management / API hook',
      'Add hover transitions & keyboard focus states',
      'Test component across mobile & desktop viewports',
    ];
  } else {
    subtasks = [
      `Specify technical requirements for ${title}`,
      `Implement core logic and database schema updates`,
      `Conduct code review and handle edge cases`,
      `Verify functionality with end-to-end testing`,
    ];
  }

  return subtasks.map((t) => ({ title: t, completed: false }));
};

// 2. Natural Language Command Parser (Ctrl + K)
exports.parseNaturalLanguageCommand = async (prompt, members = []) => {
  const ai = await getGenAI();
  const membersList = members.map((m) => `${m.name} (${m.email})`).join(', ');

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an AI assistant parsing user intent to create a software project task.
User input: "${prompt}"
Available Team Members: [${membersList}]
Today's Date: ${new Date().toISOString().split('T')[0]}

Extract the following JSON object:
{
  "title": "Clear concise task title",
  "description": "Any additional context mentioned",
  "priority": "low" | "medium" | "high",
  "status": "todo" | "inprogress" | "inreview" | "done",
  "assigneeEmail": "email of member if matched, otherwise null",
  "dueDate": "YYYY-MM-DD if mentioned, otherwise null"
}
Return ONLY valid JSON.`,
      });
      const text = response.text.trim().replace(/^```json/, '').replace(/```$/, '').trim();
      return JSON.parse(text);
    } catch (e) {
      console.warn('Gemini API parse failed, using fallback:', e.message);
    }
  }

  // Fallback heuristic parser
  const lower = prompt.toLowerCase();
  let priority = 'medium';
  if (lower.includes('high') || lower.includes('urgent') || lower.includes('asap')) priority = 'high';
  if (lower.includes('low') || lower.includes('minor')) priority = 'low';

  let matchedAssignee = null;
  for (const m of members) {
    const firstName = m.name.split(' ')[0].toLowerCase();
    if (lower.includes(firstName) || lower.includes(m.email.toLowerCase())) {
      matchedAssignee = m.email;
      break;
    }
  }

  return {
    title: prompt.replace(/assign|to|high|priority|urgent|by|tomorrow|friday|low|medium/gi, '').trim() || prompt,
    description: `Created via AI Command Bar: "${prompt}"`,
    priority,
    status: 'todo',
    assigneeEmail: matchedAssignee,
    dueDate: lower.includes('tomorrow') ? new Date(Date.now() + 86400000).toISOString().split('T')[0] : null,
  };
};

// 3. AI Project Risk & Bottleneck Audit (Telemetry pipeline)
exports.auditProjectHealth = async (projectData) => {
  const { projectName, tasks, members } = projectData;
  const ai = await getGenAI();

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze this project telemetry data and provide a Project Health Audit.
Project: ${projectName}
Team Members: ${members.map((m) => m.name).join(', ')}
Tasks JSON: ${JSON.stringify(tasks)}

Return ONLY a JSON object:
{
  "riskScore": number (0 to 100, where 100 is critical risk),
  "summary": "Short executive summary paragraph",
  "bottlenecks": ["List item 1", "List item 2"],
  "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2"]
}`,
      });
      const text = response.text.trim().replace(/^```json/, '').replace(/```$/, '').trim();
      return JSON.parse(text);
    } catch (e) {
      console.warn('Gemini API audit failed, using rule engine fallback:', e.message);
    }
  }

  // Rule engine analytics pipeline fallback
  const total = tasks.length;
  const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length;
  const highPriorityStuck = tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length;
  const unassigned = tasks.filter((t) => !t.assignee && t.status !== 'done').length;

  let riskScore = Math.min(100, Math.round((overdue * 25) + (highPriorityStuck * 15) + (unassigned * 10)));
  if (total === 0) riskScore = 0;

  const bottlenecks = [];
  if (overdue > 0) bottlenecks.push(`${overdue} tasks are overdue and require immediate milestone adjustment.`);
  if (unassigned > 0) bottlenecks.push(`${unassigned} tasks are unassigned, causing work fragmentation.`);
  if (highPriorityStuck > 2) bottlenecks.push(`${highPriorityStuck} high-priority tasks are active simultaneously.`);

  return {
    riskScore,
    summary: `Project "${projectName}" has ${total} tasks tracked. ${overdue} tasks are overdue with a calculated risk index of ${riskScore}%.`,
    bottlenecks: bottlenecks.length ? bottlenecks : ['No severe bottlenecks detected. Development pacing is stable.'],
    recommendations: [
      unassigned > 0 ? 'Assign unowned tasks to team members during next standup.' : 'Maintain current review cadence for active tasks.',
      overdue > 0 ? 'Re-evaluate due dates for overdue items or reallocate capacity.' : 'Keep high-priority tasks progressing smoothly.',
    ],
  };
};

// 4. AI Spec & Acceptance Criteria Generator
exports.generateSpec = async (title, brief) => {
  const ai = await getGenAI();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Generate a detailed technical specification & acceptance criteria for this software task:
Title: ${title}
Context/Brief: ${brief || 'None'}

Format your response as clean Markdown with section headers:
### Overview
### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
### Technical & Security Considerations`,
      });
      return response.text.trim();
    } catch (e) {
      console.warn('Gemini API spec failed, using template:', e.message);
    }
  }

  return `### Overview
Implementation spec for **${title}**.

### Acceptance Criteria
- [ ] Implement core functionality according to requirements.
- [ ] Handle input validation and edge cases (e.g. null inputs, timeouts).
- [ ] Ensure non-blocking async execution.
- [ ] Verify functionality with unit & integration tests.

### Technical & Security Considerations
- Validate user authorization before processing request.
- Ensure efficient database indexing for queries.`;
};

// 5. AI Daily Standup & Activity Digest
exports.generateStandupDigest = async (projectName, recentTasks, recentComments) => {
  const ai = await getGenAI();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Generate a 3-bullet team standup digest for project "${projectName}".
Recent Tasks: ${JSON.stringify(recentTasks)}
Recent Comments: ${JSON.stringify(recentComments)}

Return ONLY JSON:
{
  "completed": ["Item 1", "Item 2"],
  "inProgress": ["Item 1", "Item 2"],
  "blockers": ["Item 1"]
}`,
      });
      const text = response.text.trim().replace(/^```json/, '').replace(/```$/, '').trim();
      return JSON.parse(text);
    } catch (e) {
      console.warn('Gemini API digest failed, using activity pipeline:', e.message);
    }
  }

  const completed = recentTasks.filter((t) => t.status === 'done').map((t) => t.title);
  const inProgress = recentTasks.filter((t) => t.status === 'inprogress' || t.status === 'inreview').map((t) => t.title);
  const blockers = recentTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').map((t) => `${t.title} (Overdue)`);

  return {
    completed: completed.length ? completed : ['Reviewing recent pull requests'],
    inProgress: inProgress.length ? inProgress : ['Active sprint tasks in development'],
    blockers: blockers.length ? blockers : ['No active blockers logged in the last 24h'],
  };
};
