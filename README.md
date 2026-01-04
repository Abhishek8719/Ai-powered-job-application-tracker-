# 🎯 AI-Powered Job Application Tracker

A full-stack web application that helps job seekers organize their applications and leverage AI to optimize their resumes and predict interview probabilities.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC? style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

## ✨ Features

### 📊 Application Management
- **Track Applications**: Add, update, and delete job applications with essential details
  - Company name and role
  - Application status (Applied, Interviewing, Offer, Rejected)
  - Job posting URL
  - Salary information
  - Application date
- **Filter & Sort**: Organize applications by status and date
- **Visual Dashboard**: Interactive charts displaying: 
  - Total applications submitted
  - Interviews scheduled
  - Offers received
  - Rejection rate
  - 14-day application trends

### 🤖 AI-Powered Analysis

#### Resume ATS Compatibility
- Upload your resume (PDF format)
- Paste job description
- Get comprehensive ATS score (out of 100) with breakdown: 
  - **Skills Match** (50 points): Evaluate required and preferred skills alignment
  - **Role Fit** (25 points): Assess experience relevance to job responsibilities
  - **Keywords** (15 points): Analyze important keyword coverage
  - **Formatting** (10 points): Check resume structure and readability
- Receive actionable recommendations to improve your resume

#### Interview Probability Prediction
- Analyze your profile against job requirements
- Get probability score for landing an interview
- Receive AI-generated reasoning and personalized recommendations
- Optional resume upload for enhanced analysis

## 🏗️ Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Custom CSS with responsive design
- **State Management**: React Hooks (useState, useEffect, useMemo)
- **Data Visualization**: Custom SVG-based charts and graphs

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **Database**:  MySQL with connection pooling
- **Validation**: Zod schema validation
- **AI Integration**: LLM-based resume analysis and scoring
- **Authentication**: Session-based user authentication

### Database Schema
```sql
-- Applications table
- id (Primary Key)
- user_id (Foreign Key)
- company
- role
- status (enum)
- job_url
- salary
- date_applied
- created_at
- updated_at
```

## 🚀 Getting Started

### Prerequisites
- Node. js (v16 or higher)
- MySQL (v8 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Abhishek8719/Ai-powered-job-application-tracker-. git
   cd Ai-powered-job-application-tracker-
   ```

2. **Install root dependencies**
   ```bash
   npm install
   ```

3. **Setup Backend**
   ```bash
   cd backend
   npm install
   ```

   Create a `.env` file in the backend directory:
   ```env
   DATABASE_HOST=localhost
   DATABASE_USER=your_mysql_user
   DATABASE_PASSWORD=your_mysql_password
   DATABASE_NAME=job_tracker
   PORT=3001
   SESSION_SECRET=your_secret_key
   LLM_API_KEY=your_llm_api_key
   ```

4. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   ```

### Database Setup

Run the database migration scripts to create necessary tables:
```bash
cd backend
npm run migrate
```

### Running the Application

1. **Start Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   Backend will run on `http://localhost:3001`

2. **Start Frontend Development Server**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend will run on `http://localhost:5173`

3. **Access the Application**
   Open your browser and navigate to `http://localhost:5173`

## 📁 Project Structure

```
Ai-powered-job-application-tracker-/
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Main application component
│   │   ├── App.css           # Application styles
│   │   ├── api. ts            # API client functions
│   │   └── main.tsx          # Application entry point
│   ├── public/               # Static assets
│   ├── index.html            # HTML template
│   ├── package.json          # Frontend dependencies
│   └── vite.config.ts        # Vite configuration
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── applications.ts    # Application CRUD routes
│   │   │   ├── auth.ts            # Authentication routes
│   │   │   ├── dashboard.ts       # Dashboard data routes
│   │   │   └── ai.ts              # AI analysis routes
│   │   ├── utils/
│   │   │   └── ats.ts             # ATS analysis logic
│   │   ├── db.ts              # Database connection
│   │   └── index.ts           # Server entry point
│   └── package.json           # Backend dependencies
├── scripts/                   # Database migration scripts
└── package.json               # Root workspace configuration
```

## 🔒 Security Features

- Secure user authentication with session management
- Password hashing for user credentials
- Protected API routes with user verification
- SQL injection prevention through parameterized queries
- Input validation using Zod schemas

## 📈 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Applications
- `GET /api/applications` - List all applications (with filters)
- `POST /api/applications` - Create new application
- `PUT /api/applications/:id` - Update application
- `DELETE /api/applications/:id` - Delete application

### Dashboard
- `GET /api/dashboard` - Get dashboard statistics and charts

### AI Analysis
- `POST /api/ai/resume-compatibility` - Analyze resume ATS compatibility
- `POST /api/ai/interview-probability` - Predict interview probability

## 🛠️ Technologies Used

| Category | Technologies |
|----------|-------------|
| Frontend | React, TypeScript, Vite, CSS3 |
| Backend | Node.js, Express, TypeScript |
| Database | MySQL |
| Validation | Zod |
| AI/ML | LLM Integration for resume analysis |
| Tools | ESLint, Git |

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 👨‍💻 Author

**Abhishek**
- GitHub: [@Abhishek8719](https://github.com/Abhishek8719)

## 🙏 Acknowledgments

- Thanks to all contributors who help improve this project
- Inspired by the need for better job application organization tools
- AI integration powered by modern LLM technology

## 📞 Support

If you have any questions or need help, please: 
- Open an issue in the GitHub repository
- Contact the maintainer through GitHub

---

**Happy Job Hunting!  🎉**
