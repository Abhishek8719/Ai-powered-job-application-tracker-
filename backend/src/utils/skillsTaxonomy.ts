export type Skill = {
  name: string
  category:
    | 'Languages'
    | 'Frontend'
    | 'Backend'
    | 'Databases'
    | 'Cloud & DevOps'
    | 'Data & ML'
    | 'Testing'
    | 'Security'
    | 'Tools'
    | 'Concepts'
    | 'Soft Skills'
  aliases?: string[]
}

// Medium, fixed skills taxonomy (~200). Canonical `name` values are the only skills
// we allow the AI to select for scoring.
export const SKILLS_TAXONOMY: Skill[] = [
  // Languages
  { name: 'JavaScript', category: 'Languages', aliases: ['JS', 'ECMAScript'] },
  { name: 'TypeScript', category: 'Languages', aliases: ['TS'] },
  { name: 'Python', category: 'Languages' },
  { name: 'Java', category: 'Languages' },
  { name: 'C', category: 'Languages' },
  { name: 'C++', category: 'Languages', aliases: ['CPP'] },
  { name: 'C#', category: 'Languages', aliases: ['C Sharp'] },
  { name: 'Go', category: 'Languages', aliases: ['Golang'] },
  { name: 'Rust', category: 'Languages' },
  { name: 'Ruby', category: 'Languages' },
  { name: 'PHP', category: 'Languages' },
  { name: 'Kotlin', category: 'Languages' },
  { name: 'Swift', category: 'Languages' },
  { name: 'Scala', category: 'Languages' },
  { name: 'R', category: 'Languages' },
  { name: 'SQL', category: 'Languages' },
  { name: 'Bash', category: 'Languages', aliases: ['Shell scripting', 'Shell'] },
  { name: 'PowerShell', category: 'Languages' },

  // Frontend
  { name: 'HTML', category: 'Frontend', aliases: ['HTML5'] },
  { name: 'CSS', category: 'Frontend', aliases: ['CSS3'] },
  { name: 'React', category: 'Frontend', aliases: ['ReactJS'] },
  { name: 'Next.js', category: 'Frontend', aliases: ['NextJS'] },
  { name: 'Vue.js', category: 'Frontend', aliases: ['Vue', 'VueJS'] },
  { name: 'Angular', category: 'Frontend', aliases: ['AngularJS'] },
  { name: 'Svelte', category: 'Frontend' },
  { name: 'Vite', category: 'Frontend' },
  { name: 'Webpack', category: 'Frontend' },
  { name: 'Babel', category: 'Frontend' },
  { name: 'Tailwind CSS', category: 'Frontend', aliases: ['Tailwind'] },
  { name: 'Bootstrap', category: 'Frontend' },
  { name: 'Material UI', category: 'Frontend', aliases: ['MUI'] },
  { name: 'Redux', category: 'Frontend' },
  { name: 'Zustand', category: 'Frontend' },
  { name: 'MobX', category: 'Frontend' },
  { name: 'Sass', category: 'Frontend', aliases: ['SCSS'] },
  { name: 'Responsive Design', category: 'Frontend' },
  { name: 'Accessibility', category: 'Frontend', aliases: ['a11y'] },

  // Backend
  { name: 'Node.js', category: 'Backend', aliases: ['Node', 'NodeJS'] },
  { name: 'Express', category: 'Backend', aliases: ['Express.js', 'ExpressJS'] },
  { name: 'NestJS', category: 'Backend', aliases: ['Nest.js'] },
  { name: 'Django', category: 'Backend' },
  { name: 'Flask', category: 'Backend' },
  { name: 'FastAPI', category: 'Backend' },
  { name: 'Spring Boot', category: 'Backend', aliases: ['Spring'] },
  { name: '.NET', category: 'Backend', aliases: ['Dotnet', 'DotNet'] },
  { name: 'ASP.NET Core', category: 'Backend', aliases: ['ASP.NET', 'ASP.NETCore'] },
  { name: 'GraphQL', category: 'Backend' },
  { name: 'REST APIs', category: 'Backend', aliases: ['REST', 'RESTful APIs'] },
  { name: 'gRPC', category: 'Backend' },
  { name: 'WebSockets', category: 'Backend' },
  { name: 'Microservices', category: 'Backend' },
  { name: 'Monolith Architecture', category: 'Backend', aliases: ['Monolith'] },
  { name: 'Serverless', category: 'Backend' },
  { name: 'Message Queues', category: 'Backend', aliases: ['Queue', 'Queues', 'Messaging'] },
  { name: 'Kafka', category: 'Backend', aliases: ['Apache Kafka'] },
  { name: 'RabbitMQ', category: 'Backend' },
  { name: 'Redis Streams', category: 'Backend' },
  { name: 'API Design', category: 'Backend' },

  // Databases
  { name: 'MySQL', category: 'Databases' },
  { name: 'PostgreSQL', category: 'Databases', aliases: ['Postgres'] },
  { name: 'SQLite', category: 'Databases' },
  { name: 'MongoDB', category: 'Databases' },
  { name: 'Redis', category: 'Databases' },
  { name: 'Elasticsearch', category: 'Databases', aliases: ['ElasticSearch'] },
  { name: 'DynamoDB', category: 'Databases' },
  { name: 'Firestore', category: 'Databases' },
  { name: 'ORMs', category: 'Databases', aliases: ['ORM'] },
  { name: 'Prisma', category: 'Databases' },
  { name: 'Sequelize', category: 'Databases' },
  { name: 'TypeORM', category: 'Databases' },
  { name: 'Mongoose', category: 'Databases' },
  { name: 'Database Indexing', category: 'Databases', aliases: ['Indexes', 'Indexing'] },
  { name: 'Database Design', category: 'Databases' },

  // Cloud & DevOps
  { name: 'AWS', category: 'Cloud & DevOps', aliases: ['Amazon Web Services'] },
  { name: 'Azure', category: 'Cloud & DevOps', aliases: ['Microsoft Azure'] },
  { name: 'GCP', category: 'Cloud & DevOps', aliases: ['Google Cloud', 'Google Cloud Platform'] },
  { name: 'Docker', category: 'Cloud & DevOps' },
  { name: 'Kubernetes', category: 'Cloud & DevOps', aliases: ['K8s'] },
  { name: 'Terraform', category: 'Cloud & DevOps' },
  { name: 'Ansible', category: 'Cloud & DevOps' },
  { name: 'CI/CD', category: 'Cloud & DevOps', aliases: ['Continuous Integration', 'Continuous Delivery'] },
  { name: 'GitHub Actions', category: 'Cloud & DevOps' },
  { name: 'Jenkins', category: 'Cloud & DevOps' },
  { name: 'GitLab CI', category: 'Cloud & DevOps' },
  { name: 'Linux', category: 'Cloud & DevOps' },
  { name: 'Nginx', category: 'Cloud & DevOps' },
  { name: 'Load Balancing', category: 'Cloud & DevOps' },
  { name: 'Monitoring', category: 'Cloud & DevOps', aliases: ['Observability'] },
  { name: 'Logging', category: 'Cloud & DevOps' },
  { name: 'Prometheus', category: 'Cloud & DevOps' },
  { name: 'Grafana', category: 'Cloud & DevOps' },

  // Data & ML
  { name: 'Pandas', category: 'Data & ML' },
  { name: 'NumPy', category: 'Data & ML' },
  { name: 'Scikit-learn', category: 'Data & ML', aliases: ['sklearn'] },
  { name: 'TensorFlow', category: 'Data & ML' },
  { name: 'PyTorch', category: 'Data & ML' },
  { name: 'NLP', category: 'Data & ML', aliases: ['Natural Language Processing'] },
  { name: 'LLMs', category: 'Data & ML', aliases: ['Large Language Models'] },
  { name: 'OpenAI API', category: 'Data & ML', aliases: ['OpenAI'] },
  { name: 'Prompt Engineering', category: 'Data & ML' },
  { name: 'Data Analysis', category: 'Data & ML' },
  { name: 'Data Engineering', category: 'Data & ML' },
  { name: 'ETL', category: 'Data & ML' },
  { name: 'Airflow', category: 'Data & ML', aliases: ['Apache Airflow'] },
  { name: 'Spark', category: 'Data & ML', aliases: ['Apache Spark', 'PySpark'] },
  { name: 'BigQuery', category: 'Data & ML' },
  { name: 'Snowflake', category: 'Data & ML' },

  // Testing
  { name: 'Unit Testing', category: 'Testing' },
  { name: 'Integration Testing', category: 'Testing' },
  { name: 'E2E Testing', category: 'Testing', aliases: ['End-to-end testing'] },
  { name: 'Jest', category: 'Testing' },
  { name: 'Vitest', category: 'Testing' },
  { name: 'React Testing Library', category: 'Testing', aliases: ['RTL'] },
  { name: 'Cypress', category: 'Testing' },
  { name: 'Playwright', category: 'Testing' },
  { name: 'PyTest', category: 'Testing', aliases: ['pytest'] },
  { name: 'JUnit', category: 'Testing' },
  { name: 'Mocha', category: 'Testing' },

  // Security
  { name: 'Authentication', category: 'Security' },
  { name: 'Authorization', category: 'Security' },
  { name: 'JWT', category: 'Security' },
  { name: 'OAuth 2.0', category: 'Security', aliases: ['OAuth2'] },
  { name: 'OpenID Connect', category: 'Security', aliases: ['OIDC'] },
  { name: 'OWASP', category: 'Security' },
  { name: 'Security Best Practices', category: 'Security' },

  // Tools
  { name: 'Git', category: 'Tools' },
  { name: 'GitHub', category: 'Tools' },
  { name: 'GitLab', category: 'Tools' },
  { name: 'Jira', category: 'Tools' },
  { name: 'Confluence', category: 'Tools' },
  { name: 'Postman', category: 'Tools' },
  { name: 'Figma', category: 'Tools' },
  { name: 'VS Code', category: 'Tools', aliases: ['Visual Studio Code'] },
  { name: 'npm', category: 'Tools' },
  { name: 'pnpm', category: 'Tools' },
  { name: 'yarn', category: 'Tools' },

  // Concepts
  { name: 'Object-Oriented Programming', category: 'Concepts', aliases: ['OOP'] },
  { name: 'Functional Programming', category: 'Concepts' },
  { name: 'Data Structures & Algorithms', category: 'Concepts', aliases: ['DSA'] },
  { name: 'System Design', category: 'Concepts' },
  { name: 'Scalability', category: 'Concepts' },
  { name: 'Performance Optimization', category: 'Concepts' },
  { name: 'Caching', category: 'Concepts' },
  { name: 'Concurrency', category: 'Concepts' },
  { name: 'Distributed Systems', category: 'Concepts' },
  { name: 'Agile', category: 'Concepts' },
  { name: 'Scrum', category: 'Concepts' },
  { name: 'Kanban', category: 'Concepts' },

  // Soft Skills
  { name: 'Communication', category: 'Soft Skills' },
  { name: 'Collaboration', category: 'Soft Skills', aliases: ['Teamwork'] },
  { name: 'Problem Solving', category: 'Soft Skills' },
  { name: 'Ownership', category: 'Soft Skills' },
  { name: 'Leadership', category: 'Soft Skills' },
  { name: 'Mentoring', category: 'Soft Skills' }
]

export const SKILL_NAMES = SKILLS_TAXONOMY.map((s) => s.name)

export function buildSkillAliasMap(): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const skill of SKILLS_TAXONOMY) {
    const aliases = [skill.name, ...(skill.aliases ?? [])]
    map.set(skill.name, aliases)
  }
  return map
}
