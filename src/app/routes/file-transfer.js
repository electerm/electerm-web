/**
 * file download/upload routes
 */

import multer from 'multer'
import fs from 'fs'
import path, { resolve } from 'path'
import { spawn } from 'child_process'
import {
  jwtAuth,
  errHandler
} from '../lib/jwt.js'

const uploadDir = resolve(process.env.DB_PATH || resolve(process.cwd(), 'data'), 'uploads')
fs.mkdirSync(uploadDir, { recursive: true })
const upload = multer({ dest: uploadDir })

export function fileTransferRoutes (app) {
  app.get('/api/download', jwtAuth, errHandler, (req, res) => {
    const filePath = req.query.path
    if (!filePath) {
      return res.status(400).json({ error: 'path is required' })
    }
    try {
      const stat = fs.statSync(filePath)
      if (stat.isFile()) {
        const fileName = path.basename(filePath)
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`)
        res.setHeader('Content-Type', 'application/octet-stream')
        fs.createReadStream(filePath).pipe(res)
      } else if (stat.isDirectory()) {
        const dirName = path.basename(filePath)
        const parentDir = path.dirname(filePath)
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(dirName)}.tar.gz"`)
        res.setHeader('Content-Type', 'application/gzip')
        const tar = spawn('tar', ['czf', '-', '-C', parentDir, dirName])
        tar.stdout.pipe(res)
        tar.stderr.on('data', (data) => {
          console.error('tar stderr:', data.toString())
        })
        tar.on('error', (err) => {
          console.error('tar error:', err)
          if (!res.headersSent) {
            res.status(500).json({ error: err.message })
          }
        })
      } else {
        res.status(400).json({ error: 'path is not a file or directory' })
      }
    } catch (err) {
      console.error('download error:', err)
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/upload', jwtAuth, errHandler, upload.single('file'), (req, res) => {
    const targetDir = req.body.path
    if (!targetDir || !req.file) {
      return res.status(400).json({ error: 'path and file are required' })
    }
    try {
      const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8')
      const destPath = path.join(targetDir, originalName)
      fs.renameSync(req.file.path, destPath)
      res.json({ success: true, path: destPath })
    } catch (err) {
      console.error('upload error:', err)
      res.status(500).json({ error: err.message })
    }
  })
}
