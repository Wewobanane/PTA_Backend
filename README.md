# PTA Management System Backend

A comprehensive Parent-Teacher Association Management System backend API built with Node.js, Express, and MongoDB.

## 🎯 Features

### 1. **User Management**
- Role-based authentication (Admin, Teacher, Parent)
- JWT token-based security
- Profile management

### 2. **Student Management**
- Student profiles with detailed information
- Parent-student relationship linking
- Class and section management

### 3. **Behavior Tracking** ⭐
- Record positive and negative behaviors
- Multiple behavior categories
- Severity levels (low, medium, high, critical)
- Parent notifications
- Behavior statistics and analytics

### 4. **Academic Monitoring**
- Grade management for various assessments
- Automatic grade calculation
- Subject-wise performance tracking
- Term-based reporting

### 5. **Attendance System**
- Daily attendance tracking
- Multiple status types (present, absent, late, excused)
- Attendance statistics
- Bulk attendance recording

### 6. **Communication Tools**
- Secure messaging between parents and teachers
- School-wide announcements
- Meeting scheduling
- Real-time notifications via Socket.io

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   cd pta_backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```

   Update the `.env` file with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/pta_system
   JWT_SECRET=your_secret_key_here
   JWT_EXPIRE=7d
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start MongoDB**
   ```bash
   # Make sure MongoDB is running
   mongod
   ```

5. **Run the application**
   
   Development mode (with auto-reload):
   ```bash
   npm run dev
   ```

   Production mode:
   ```bash
   npm start
   ```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user
- `PUT /api/auth/updateprofile` - Update profile
- `PUT /api/auth/updatepassword` - Update password

### Students
- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get single student
- `POST /api/students` - Create student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student
- `GET /api/students/parent/me` - Get parent's children
- `POST /api/students/:id/link-parent` - Link parent to student

### Behavior Tracking
- `GET /api/behaviors` - Get all behavior records
- `GET /api/behaviors/:id` - Get single behavior record
- `POST /api/behaviors` - Create behavior record
- `PUT /api/behaviors/:id` - Update behavior record
- `DELETE /api/behaviors/:id` - Delete behavior record
- `GET /api/behaviors/stats/:studentId` - Get behavior statistics

### Grades
- `GET /api/grades` - Get all grades
- `GET /api/grades/:id` - Get single grade
- `POST /api/grades` - Create grade
- `PUT /api/grades/:id` - Update grade
- `DELETE /api/grades/:id` - Delete grade
- `GET /api/grades/stats/:studentId` - Get grade statistics

### Attendance
- `GET /api/attendance` - Get all attendance records
- `GET /api/attendance/:id` - Get single record
- `POST /api/attendance` - Create attendance record
- `PUT /api/attendance/:id` - Update attendance
- `DELETE /api/attendance/:id` - Delete attendance
- `POST /api/attendance/bulk` - Bulk create attendance
- `GET /api/attendance/stats/:studentId` - Get attendance statistics

### Communication
- `GET /api/communication/messages` - Get messages
- `POST /api/communication/messages` - Send message
- `GET /api/communication/messages/:id` - Get single message
- `DELETE /api/communication/messages/:id` - Delete message
- `GET /api/communication/messages/unread/count` - Get unread count

- `GET /api/communication/announcements` - Get announcements
- `POST /api/communication/announcements` - Create announcement
- `GET /api/communication/announcements/:id` - Get single announcement
- `PUT /api/communication/announcements/:id` - Update announcement
- `DELETE /api/communication/announcements/:id` - Delete announcement

- `GET /api/communication/meetings` - Get meetings
- `POST /api/communication/meetings` - Create meeting
- `GET /api/communication/meetings/:id` - Get single meeting
- `PUT /api/communication/meetings/:id` - Update meeting
- `DELETE /api/communication/meetings/:id` - Delete meeting
- `PUT /api/communication/meetings/:id/respond` - Respond to meeting

## 🔐 Authentication

All endpoints (except register and login) require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

Or the token will be automatically read from cookies.

## 👥 User Roles

### Admin
- Full system access
- Manage all users, students, and records
- View all data

### Teacher
- Create and manage behavior records
- Record grades and attendance
- Send messages and announcements
- Schedule meetings
- View students in their classes

### Parent
- View their children's information
- Check behavior records, grades, and attendance
- Communicate with teachers
- Respond to meetings
- View announcements

## 🔌 Real-time Features (Socket.io)

The system includes Socket.io for real-time communication:

- **Events**:
  - `join` - Join user-specific room
  - `sendMessage` - Send real-time message
  - `sendNotification` - Send notification
  - `newMessage` - Receive new message
  - `newNotification` - Receive notification

## 📊 Database Models

- **User** - Admin, Teacher, Parent accounts
- **Student** - Student information and relationships
- **Behavior** - Behavior tracking records
- **Grade** - Academic grades and assessments
- **Attendance** - Daily attendance records
- **Message** - Private messages between users
- **Announcement** - School-wide announcements
- **Meeting** - Scheduled meetings

## 🛡️ Security Features

- JWT authentication
- Password hashing with bcrypt
- Role-based access control
- Request rate limiting
- Helmet.js for security headers
- CORS protection
- Input validation with express-validator

## 📝 Example Usage

### Register a new user
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "teacher",
  "phone": "+1234567890",
  "subject": "Mathematics"
}
```

### Create a behavior record
```bash
POST /api/behaviors
Authorization: Bearer <token>
Content-Type: application/json

{
  "student": "student_id",
  "type": "positive",
  "category": "participation",
  "title": "Excellent class participation",
  "description": "Student actively participated in group discussions",
  "severity": "low",
  "subject": "Mathematics"
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Developer

Built with ❤️ for improving parent-teacher communication and student monitoring.

---

For any questions or issues, please open an issue on GitHub.
