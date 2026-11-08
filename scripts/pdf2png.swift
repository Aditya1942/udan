// Usage: swift scripts/pdf2png.swift <file.pdf|dir> [scale=1.5]
// Writes <file>-p<N>.png next to each PDF (every page) so templates can be eyeballed with the Read tool.
import Foundation
import PDFKit
import AppKit

let args = CommandLine.arguments
guard args.count >= 2 else { print("usage: pdf2png <pdf|dir> [scale]"); exit(1) }
let scale = args.count >= 3 ? CGFloat(Double(args[2]) ?? 1.5) : 1.5
var files: [URL] = []
let target = URL(fileURLWithPath: args[1])
var isDir: ObjCBool = false
FileManager.default.fileExists(atPath: target.path, isDirectory: &isDir)
if isDir.boolValue {
  let e = FileManager.default.enumerator(at: target, includingPropertiesForKeys: nil)!
  for case let u as URL in e where u.pathExtension == "pdf" { files.append(u) }
} else { files = [target] }
for f in files {
  guard let doc = PDFDocument(url: f) else { print("skip \(f.path)"); continue }
  for i in 0..<doc.pageCount {
    guard let page = doc.page(at: i) else { continue }
    let b = page.bounds(for: .mediaBox)
    let w = Int(b.width * scale), h = Int(b.height * scale)
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    let ctx = NSGraphicsContext(bitmapImageRep: rep)!
    NSGraphicsContext.current = ctx
    ctx.cgContext.setFillColor(NSColor.white.cgColor)
    ctx.cgContext.fill(CGRect(x: 0, y: 0, width: w, height: h))
    ctx.cgContext.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: ctx.cgContext)
    NSGraphicsContext.restoreGraphicsState()
    let out = f.deletingPathExtension().path + "-p\(i + 1).png"
    try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out))
    print(out)
  }
}
