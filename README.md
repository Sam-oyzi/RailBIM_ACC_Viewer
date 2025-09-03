# Autodesk Viewer Application

A modern web application for uploading, translating, and viewing 3D models using the Autodesk Platform Services (APS) Viewer. This application provides a clean interface for managing CAD files and visualizing them in a web browser.

![Autodesk Viewer](https://img.shields.io/badge/Autodesk-Viewer-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey)

## Features

- 🚀 **File Upload & Translation**: Support for multiple CAD formats (RVT, DWG, IFC, NWD, 3DS, FBX, OBJ, STEP, IGES, ZIP)
- 👁️ **3D Visualization**: Interactive 3D model viewing with Autodesk Viewer
- 📊 **Real-time Progress**: Live translation status and progress tracking
- 🎨 **Modern UI**: Clean, responsive interface with loading states and notifications
- 🔒 **Security**: Proper input validation and secure credential management
- 📝 **Logging**: Comprehensive logging system with multiple levels
- ⚡ **Error Handling**: Robust error handling with user-friendly messages

## Supported File Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| Revit | `.rvt` | Autodesk Revit files |
| AutoCAD | `.dwg` | AutoCAD drawing files |
| IFC | `.ifc` | Industry Foundation Classes |
| Navisworks | `.nwd` | Navisworks files |
| 3D Studio | `.3ds` | 3D Studio Max files |
| FBX | `.fbx` | Filmbox files |
| OBJ | `.obj` | Wavefront OBJ files |
| STEP | `.step` | Standard for Exchange of Product Data |
| IGES | `.iges` | Initial Graphics Exchange Specification |
| ZIP | `.zip` | Compressed archives containing supported formats |

## Prerequisites

- **Node.js** 18.0 or higher
- **npm** 8.0 or higher
- **Autodesk Platform Services Account** with Model Derivative API access

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Autodesk_Viewer
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file and configure your APS credentials:

```bash
cp .env.example .env
```

Edit the `.env` file with your Autodesk Platform Services credentials:

```env
# Autodesk Platform Services Configuration
APS_CLIENT_ID=your_client_id_here
APS_CLIENT_SECRET=your_client_secret_here
APS_BUCKET=your_unique_bucket_name_here

# Server Configuration
PORT=8080
NODE_ENV=development

# Logging Configuration
LOG_LEVEL=INFO
LOG_TO_FILE=true
LOG_TO_CONSOLE=true
```

### 4. Obtain APS Credentials

1. Visit the [Autodesk Platform Services Portal](https://aps.autodesk.com/)
2. Create a new application or use an existing one
3. Note down your **Client ID** and **Client Secret**
4. Ensure your app has access to the **Model Derivative API**

### 5. Start the Application

```bash
npm start
```

The application will be available at `http://localhost:8080`

## Usage

### Uploading Models

1. **Open the Application**: Navigate to `http://localhost:8080` in your web browser
2. **Select File**: Click the "Upload" button to select a CAD file from your computer
3. **File Validation**: The system will validate file type and size (max 100MB)
4. **Upload Progress**: Monitor the upload progress with real-time feedback
5. **Translation**: Once uploaded, the file will be automatically translated for viewing

### Viewing Models

1. **Model Selection**: Use the dropdown menu to select from available models
2. **Translation Status**: Monitor translation progress with live updates
3. **3D Viewer**: Once translation is complete, the model will load in the interactive 3D viewer
4. **Navigation**: Use mouse controls to rotate, pan, and zoom the model

### ZIP File Handling

When uploading ZIP files:
1. The system will prompt for the main design file within the archive
2. Enter the filename (e.g., `model.rvt`, `drawing.dwg`)
3. The system will extract and process the specified file

## API Documentation

### Authentication Endpoints

#### GET `/auth/token`
Retrieve an access token for the Autodesk Viewer.

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer"
}
```

### Model Management Endpoints

#### GET `/models`
Retrieve a list of all uploaded models.

**Response:**
```json
[
  {
    "name": "sample-model.rvt",
    "urn": "dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6..."
  }
]
```

#### POST `/models`
Upload a new model file.

**Request:**
- Content-Type: `multipart/form-data`
- Field: `model-file` (file)
- Optional Field: `model-zip-entrypoint` (string, for ZIP files)

**Response:**
```json
{
  "name": "uploaded-model.rvt",
  "urn": "dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6..."
}
```

#### GET `/models/:urn/status`
Get the translation status of a specific model.

**Parameters:**
- `urn`: The model's URN (URL-encoded)

**Response:**
```json
{
  "status": "success",
  "progress": "Complete",
  "messages": []
}
```

**Status Values:**
- `n/a`: Model not translated
- `inprogress`: Translation in progress
- `success`: Translation completed successfully
- `failed`: Translation failed

## Project Structure

```
Autodesk_Viewer/
├── config.js              # Configuration management
├── server.js              # Express server setup
├── package.json           # Dependencies and scripts
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
├── routes/
│   ├── auth.js           # Authentication routes
│   └── models.js         # Model management routes
├── services/
│   └── aps.js            # Autodesk Platform Services integration
├── utils/
│   └── logger.js         # Logging utility
├── wwwroot/              # Static web files
│   ├── index.html        # Main application page
│   ├── upload-viewer.html # Upload and viewer interface
│   ├── main.js           # Client-side JavaScript
│   ├── main.css          # Styling
│   └── utils.js          # Client-side utilities
├── uploads/              # Temporary upload directory
└── logs/                 # Application logs
    ├── combined-YYYY-MM-DD.log
    └── error-YYYY-MM-DD.log
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `APS_CLIENT_ID` | Autodesk Platform Services Client ID | - | Yes |
| `APS_CLIENT_SECRET` | Autodesk Platform Services Client Secret | - | Yes |
| `APS_BUCKET` | Unique bucket name for file storage | - | Yes |
| `PORT` | Server port number | 8080 | No |
| `NODE_ENV` | Environment (development/production) | development | No |
| `LOG_LEVEL` | Logging level (ERROR/WARN/INFO/DEBUG) | INFO | No |
| `LOG_TO_FILE` | Enable file logging | true | No |
| `LOG_TO_CONSOLE` | Enable console logging | true | No |

### Logging Levels

- **ERROR**: Critical errors that require immediate attention
- **WARN**: Warning messages for potential issues
- **INFO**: General information about application flow
- **DEBUG**: Detailed information for debugging purposes

## Development

### Running in Development Mode

```bash
# Install dependencies
npm install

# Set environment to development
export NODE_ENV=development

# Start with auto-reload (if using nodemon)
npm run dev

# Or start normally
npm start
```

### Code Style and Linting

The project follows standard JavaScript conventions:
- Use semicolons
- 4-space indentation
- Camelcase naming
- Comprehensive error handling

## Troubleshooting

### Common Issues

#### 1. Authentication Errors
**Problem**: "Failed to authenticate with Autodesk Platform Services"

**Solutions:**
- Verify your `APS_CLIENT_ID` and `APS_CLIENT_SECRET` in `.env`
- Ensure your APS application has Model Derivative API access
- Check that credentials are not expired

#### 2. File Upload Failures
**Problem**: "Upload failed" or "Unsupported file type"

**Solutions:**
- Verify file format is supported (see supported formats table)
- Check file size is under 100MB limit
- Ensure stable internet connection
- Check server logs for detailed error information

#### 3. Translation Stuck
**Problem**: Model translation shows "inprogress" indefinitely

**Solutions:**
- Wait longer (complex models can take 10+ minutes)
- Check APS service status
- Verify file integrity
- Review error logs for translation failures

#### 4. Viewer Not Loading
**Problem**: 3D viewer fails to display model

**Solutions:**
- Ensure translation completed successfully
- Check browser console for JavaScript errors
- Verify access token is valid
- Try refreshing the page

### Log Files

Check the following log files for detailed error information:
- `logs/error-YYYY-MM-DD.log`: Error-level messages only
- `logs/combined-YYYY-MM-DD.log`: All log messages

### Debug Mode

Enable debug logging by setting:
```env
LOG_LEVEL=DEBUG
```

## Security Considerations

- **Environment Variables**: Never commit `.env` files to version control
- **File Validation**: All uploads are validated for type and size
- **Input Sanitization**: User inputs are properly validated and sanitized
- **Error Handling**: Internal errors are not exposed to clients in production
- **HTTPS**: Use HTTPS in production environments

## Performance Optimization

- **File Size Limits**: 100MB maximum file size to prevent server overload
- **Concurrent Uploads**: System handles multiple simultaneous uploads
- **Caching**: Static assets are cached for better performance
- **Compression**: Enable gzip compression in production

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Check the troubleshooting section above
- Review application logs
- Consult [Autodesk Platform Services Documentation](https://aps.autodesk.com/developer/documentation)
- Open an issue in the project repository

## Acknowledgments

- [Autodesk Platform Services](https://aps.autodesk.com/) for the powerful 3D visualization APIs
- [Express.js](https://expressjs.com/) for the web framework
- [Multer](https://github.com/expressjs/multer) for file upload handling
