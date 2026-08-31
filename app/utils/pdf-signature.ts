import { PDFDocument, rgb } from 'pdf-lib'

export interface SignatureData {
  imageData: string // Base64 data URL
  x: number
  y: number
  width: number
  height: number
  page?: number // Page number (1-based)
}

export interface SignerInfo {
  name: string
  email: string
  date: string
  level: number
}

async function removeWhiteBackground(dataUrl: string): Promise<string> {
  if (!import.meta.client || !dataUrl.startsWith('data:image/')) return dataUrl

  const image = new Image()
  image.crossOrigin = 'anonymous'
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Failed to load signature image'))
    image.src = dataUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl

  ctx.drawImage(image, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = imageData.data
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i] || 0
    const g = pixels[i + 1] || 0
    const b = pixels[i + 2] || 0
    if (r > 242 && g > 242 && b > 242) {
      pixels[i + 3] = 0
    }
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

/**
 * Add a signature image to a PDF
 */
export async function addSignatureToPdf(
  pdfBytes: Uint8Array,
  signatures: SignatureData[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  
  for (const signature of signatures) {
    const pageIndex = (signature.page || 1) - 1
    const page = pdfDoc.getPages()[pageIndex]
    
    if (!page) {
      console.warn(`Page ${signature.page} not found`)
      continue
    }

    const normalizedImageData = await removeWhiteBackground(signature.imageData)

    // Extract base64 data from data URL
    const base64Data = normalizedImageData.split(',')[1]
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
    
    // Embed the signature image
    let image
    try {
      if (normalizedImageData.includes('image/png')) {
        image = await pdfDoc.embedPng(imageBytes)
      } else {
        image = await pdfDoc.embedJpg(imageBytes)
      }
    } catch (e) {
      console.error('Failed to embed signature image:', e)
      continue
    }

    // Draw the signature on the page
    page.drawImage(image, {
      x: signature.x,
      y: signature.y,
      width: signature.width,
      height: signature.height,
    })
  }

  return await pdfDoc.save()
}

/**
 * Add signature boxes to a PDF for multiple approvers
 */
export async function addSignatureBoxesToPdf(
  pdfBytes: Uint8Array,
  signers: SignerInfo[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const pages = pdfDoc.getPages()
  const lastPage = pages[pages.length - 1]
  
  if (!lastPage) return pdfBytes

  const { width, height } = lastPage.getSize()
  
  // Add a new page for signatures if needed
  const signaturePage = pdfDoc.addPage([width, height])

  // Title
  signaturePage.drawText('Approval Signatures', {
    x: 50,
    y: height - 50,
    size: 16,
    color: rgb(0, 0, 0),
  })

  // Draw signature boxes
  let currentY = height - 100
  const boxHeight = 120
  const boxWidth = 250
  const boxMargin = 20

  for (const signer of signers) {
    if (currentY < 50) {
      // Need new page
      const newPage = pdfDoc.addPage([width, height])
      currentY = height - 50
    }

    // Draw box
    signaturePage.drawRectangle({
      x: 50,
      y: currentY - boxHeight,
      width: boxWidth,
      height: boxHeight,
      borderColor: rgb(0.5, 0.5, 0.5),
      borderWidth: 1,
    })

    // Level label
    signaturePage.drawText(`Level ${signer.level}`, {
      x: 60,
      y: currentY - 20,
      size: 10,
      color: rgb(0.3, 0.3, 0.3),
    })

    // Name
    signaturePage.drawText(signer.name, {
      x: 60,
      y: currentY - 40,
      size: 12,
      color: rgb(0, 0, 0),
    })

    // Email
    signaturePage.drawText(signer.email, {
      x: 60,
      y: currentY - 55,
      size: 9,
      color: rgb(0.4, 0.4, 0.4),
    })

    // Signature line
    signaturePage.drawLine({
      start: { x: 60, y: currentY - 85 },
      end: { x: boxWidth + 30, y: currentY - 85 },
      thickness: 1,
      color: rgb(0.5, 0.5, 0.5),
    })

    signaturePage.drawText('Signature & Date', {
      x: 60,
      y: currentY - 105,
      size: 8,
      color: rgb(0.5, 0.5, 0.5),
    })

    currentY -= (boxHeight + boxMargin)
  }

  return await pdfDoc.save()
}

/**
 * Create a signed PDF with all approver signatures
 */
export async function createSignedPdf(
  originalPdfBytes: Uint8Array,
  workflows: Array<{
    level: number
    approver_name: string
    approver_email: string
    signature_data: string
    signed_at: string
  }>
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalPdfBytes)
  const pages = pdfDoc.getPages()
  const lastPage = pages[pages.length - 1]
  
  if (!lastPage) return originalPdfBytes

  const { width, height } = lastPage.getSize()
  
  // Add signature page
  const signaturePage = pdfDoc.addPage([width, height])

  // Title
  signaturePage.drawText('Approval Signatures', {
    x: 50,
    y: height - 50,
    size: 18,
    color: rgb(0, 0, 0),
  })

  signaturePage.drawText('This document has been approved by:', {
    x: 50,
    y: height - 75,
    size: 12,
    color: rgb(0.3, 0.3, 0.3),
  })

  // Draw signatures
  let currentY = height - 120
  const sigHeight = 80
  const sigWidth = 200

  for (const workflow of workflows) {
    if (currentY < 150) {
      // Would overflow, skip or add new page
      break
    }

    // Box
    signaturePage.drawRectangle({
      x: 50,
      y: currentY - sigHeight - 60,
      width: width - 100,
      height: sigHeight + 60,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    })

    // Level
    signaturePage.drawText(`Level ${workflow.level}`, {
      x: 60,
      y: currentY - 20,
      size: 10,
      color: rgb(0.4, 0.4, 0.4),
    })

    // Name and details
    signaturePage.drawText(workflow.approver_name, {
      x: 60,
      y: currentY - 40,
      size: 12,
      color: rgb(0, 0, 0),
    })

    signaturePage.drawText(workflow.approver_email, {
      x: 60,
      y: currentY - 55,
      size: 9,
      color: rgb(0.5, 0.5, 0.5),
    })

    // Signature image
    if (workflow.signature_data) {
      try {
        const normalizedSignatureData = await removeWhiteBackground(workflow.signature_data)
        const base64Data = normalizedSignatureData.split(',')[1]
        const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
        
        let sigImage
        if (normalizedSignatureData.includes('image/png')) {
          sigImage = await pdfDoc.embedPng(imageBytes)
        } else {
          sigImage = await pdfDoc.embedJpg(imageBytes)
        }

        signaturePage.drawImage(sigImage, {
          x: 60,
          y: currentY - sigHeight - 50,
          width: sigWidth,
          height: sigHeight,
        })
      } catch (e) {
        console.error('Failed to embed signature:', e)
      }
    }

    // Date
    const signedDate = new Date(workflow.signed_at).toLocaleString('id-ID')
    signaturePage.drawText(`Signed: ${signedDate}`, {
      x: width - 300,
      y: currentY - 40,
      size: 9,
      color: rgb(0.5, 0.5, 0.5),
    })

    currentY -= (sigHeight + 80)
  }

  return await pdfDoc.save()
}

/**
 * Convert PDF bytes to base64 data URL
 */
export function pdfBytesToDataUrl(pdfBytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...pdfBytes))
  return `data:application/pdf;base64,${base64}`
}

/**
 * Download PDF bytes as a file
 */
export function downloadPdf(pdfBytes: Uint8Array, filename: string) {
  // Avoid SharedArrayBuffer reference when not available (non cross-origin isolated contexts)
  const needsCopy = typeof SharedArrayBuffer !== 'undefined' && pdfBytes.buffer instanceof SharedArrayBuffer
  let buffer: ArrayBuffer
  if (needsCopy) {
    buffer = pdfBytes.slice().buffer
  } else {
    buffer = pdfBytes.buffer as ArrayBuffer
  }

  const blob = new Blob([buffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
