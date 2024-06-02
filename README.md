# FileShare Web Application



## Overview
The FileShare Web Application is a platform built to facilitate easy sharing of files through file uploads and QR code generation. It utilizes React with TypeScript on the frontend and Django with Python on the backend. The app allows users to upload files, generate QR codes for those files, and share them effortlessly.

## Features
- **File Upload:** Users can easily upload files of various formats.
- **QR Code Generation:** Automatically generates QR codes for each uploaded file.
- **File Sharing:** Share files by scanning QR codes generated by the application.

## Technologies Used
- **Frontend:**
  - React: JavaScript library for building user interfaces.
  - TypeScript: Adds static typing to JavaScript to improve code quality.
  - Vite: A build tool for modern web development.
- **Backend:**
  - Django: High-level Python web framework for rapid development.
  - Python: Backend programming language.
- **Other Tools:**
  - QR Code Generator Library: Used to dynamically generate QR codes.
  - Axios: HTTP client for making requests to the backend API.
  - Django REST Framework: Toolkit for building Web APIs in Django.

## Installation
1. **Backend Setup:**
   - Clone the repository: `git clone <repository-url>`
   - Navigate to the backend directory: `cd backend`
   - Install dependencies: `pip install -r requirements.txt`
   - Run migrations: `python manage.py makemigrations`
   - Run migrations: `python manage.py migrate`
   - Start the backend server: `python manage.py runserver`

2. **Frontend Setup:**
   - Navigate to the frontend directory: `cd frontend`
   - Install dependencies: `npm install`
   - Start the frontend server: `npm run dev`

## Usage

1. **File Upload:**
   - After logging in, users can upload files by clicking on the upload button and selecting the desired files from their device.

2. **QR Code Generation:**
   - Once the file is uploaded, a QR code corresponding to that file will be generated automatically.

3. **File Sharing:**
   - Users can share files by either downloading them directly from the application or by scanning the QR code generated for each file.
3. **QR code detection:**
   - Backend detects QR code in a  given image.

## Screenshots
![IMG-20240602-WA0018](https://github.com/fury-r/filesharer/assets/79844581/8c1cfb33-0551-497b-bf8e-59acc12f0586)
![IMG-20240602-WA0017](https://github.com/fury-r/filesharer/assets/79844581/fc49c4ca-3f4c-4daa-ad28-d2fd3fd0694e)
![IMG-20240602-WA0020](https://github.com/fury-r/filesharer/assets/79844581/27b13a4f-886a-4155-a005-e9f54ea11fac)
![IMG-20240602-WA0016](https://github.com/fury-r/filesharer/assets/79844581/ab066241-7a4e-4e4e-99dc-8d13da15b487)
![IMG-20240602-WA0015](https://github.com/fury-r/filesharer/assets/79844581/a775e1c0-46fe-4559-ac7e-6f90b40d5f23)
![IMG-20240602-WA0019](https://github.com/fury-r/filesharer/assets/79844581/75062c90-ec19-4e22-a59b-a80ec6ab3447)

## Future Improvements
- Implement additional security measures such as encryption for file uploads.
- Add support for user-defined expiry times for shared files.
- Enhance the user interface for better user experience.
- Implement real-time notifications for file uploads and downloads.

## Contributors
- Rajeev Dessai - Full Stack Developer

## License
This project is licensed under the [License Name] License - see the [LICENSE.md](link-to-license-file) file for details.

## Contact
For any inquiries or issues, please contact @fury-r.
