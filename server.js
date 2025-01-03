const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const multer = require('multer');
const compression = require('compression');
const cors = require('cors');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(compression());

// Default Directory Setup
const baseDir = path.join(__dirname, 'file_system');
if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
    console.log(`Base directory created at ${baseDir}`);
}

// SFTP Setup
const sftpUser = 'Lackothy';
const sftpPassword = 'Hamada2010$';
const sftpPort = 2222;

// Ensure SSHD is installed and configure it for SFTP
exec(`
  if ! [ -x "$(command -v sshd)" ]; then
    echo "Installing OpenSSH Server...";
    sudo apt-get update && sudo apt-get install -y openssh-server;
  fi;

  # Add SFTP user
  sudo useradd -m ${sftpUser} -s /usr/sbin/nologin;
  echo "${sftpUser}:${sftpPassword}" | sudo chpasswd;

  # Set permissions
  sudo mkdir -p ${baseDir};
  sudo chown ${sftpUser}:${sftpUser} ${baseDir};

  # Update SSHD config
  echo "
Match User ${sftpUser}
    ChrootDirectory ${baseDir}
    ForceCommand internal-sftp
    AllowTcpForwarding no
    X11Forwarding no
" | sudo tee -a /etc/ssh/sshd_config;

  # Restart SSH service
  sudo systemctl restart sshd;
`);

// Multer for File Uploads
const storage = multer.diskStorage({
    destination: baseDir,
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
const upload = multer({ storage });

// Root Route
app.get('/', (req, res) => {
    res.send('Welcome to the File Server!');
});

// API Routes
app.post('/upload', upload.single('file'), (req, res) => {
    res.status(201).send(`File ${req.file.filename} uploaded successfully.`);
});

app.get('/files', (req, res) => {
    fs.readdir(baseDir, (err, files) => {
        if (err) return res.status(500).send('Error reading files');
        res.json(files);
    });
});

app.get('/download/:filename', (req, res) => {
    const filePath = path.join(baseDir, req.params.filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
    }
    res.download(filePath);
});

app.delete('/delete/:filename', (req, res) => {
    const filePath = path.join(baseDir, req.params.filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
    }
    fs.unlinkSync(filePath);
    res.send('File deleted');
});

// Start Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`SFTP accessible at sftp://${sftpUser}:${sftpPassword}@localhost:${sftpPort}`);
});
