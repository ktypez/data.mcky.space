#!/usr/bin/env node
/**
 * lint-jsx-nesting — no interactive element may wrap another interactive
 * element in src JSX.
 *
 * Invalid HTML like a button nested in a button, a Button component inside
 * an anchor/Link, or form controls inside a button triggers React's
 * validateDOMNesting console warnings and breaks semantics. The PopoverMenu
 * wrapper was a button-in-button offender (fixed to a span) and RouteModal
 * had a Button inside an <a> (fixed to style the anchor with buttonVariants).
 *
 * Parsed with the TypeScript compiler API so comments, string literals and
 * arrow functions inside attributes can't produce false positives.
 *
 * Usage:
 *   node scripts/lint-jsx-nesting.mjs            # scan, exit 1 on violations
 *   node scripts/lint-jsx-nesting.mjs --json     # machine-readable output
 *
 * The same function backs tests/jsx-nesting.test.ts so the check runs both
 * locally (`npm run lint:jsx-nesting`) and in the vitest suite.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')

const INTERACTIVE = new Set([
  'button', 'Button', 'a', 'Link', 'NavLink', 'input', 'select', 'textarea',
])

function allTsxFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) return allTsxFiles(full)
    return entry.endsWith('.tsx') && !entry.endsWith('.test.tsx') ? [full] : []
  })
}

function elementName(node) {
  if (ts.isIdentifier(node)) return node.text
  if (ts.isPropertyAccessExpression(node)) return node.name.text
  return '<expr>'
}

function findNestedInteractive(sourceFile, parentName, node, hits, fileName) {
  // Only JsxElement (has children) can nest anything.
  if (!ts.isJsxElement(node)) return

  const record = (childName, child) => {
    const line = sourceFile.getLineAndCharacterOfPosition(child.getStart(sourceFile)).line + 1
    hits.push({ file: fileName, line, parent: parentName, child: childName })
  }

  const checkChild = (child) => {
    if (ts.isJsxElement(child)) {
      const childName = elementName(child.openingElement.tagName)
      if (INTERACTIVE.has(childName)) record(childName, child)
      findNestedInteractive(sourceFile, childName, child, hits, fileName)
    } else if (ts.isJsxSelfClosingElement(child)) {
      const childName = elementName(child.tagName)
      if (INTERACTIVE.has(childName)) record(childName, child)
    } else if (ts.isJsxFragment(child)) {
      for (const fragChild of child.children) {
        if (ts.isJsxElement(fragChild)) {
          const name = elementName(fragChild.openingElement.tagName)
          if (INTERACTIVE.has(name)) record(name, fragChild)
        } else if (ts.isJsxSelfClosingElement(fragChild)) {
          const name = elementName(fragChild.tagName)
          if (INTERACTIVE.has(name)) record(name, fragChild)
        }
      }
    }
  }

  for (const child of node.children) checkChild(child)
}

/**
 * Is a given file worth scanning? Files passed explicitly (e.g. changed files
 * from a PR) are restricted to src/*.tsx and test files are skipped — the
 * trigger/assertion strings in *.test.tsx would otherwise be false positives.
 */
function isScannable(file) {
  const abs = path.resolve(file)
  if (!abs.startsWith(SRC + path.sep)) return false
  if (!abs.endsWith('.tsx')) return false
  if (abs.endsWith('.test.tsx')) return false
  return true
}

/** Scan srcDir (or an explicit file list) for interactive-inside-interactive JSX. */
export function scanJsxNesting(srcDir = SRC, files) {
  const hits = []
  const list = files && files.length ? files.filter(isScannable) : allTsxFiles(srcDir)
  for (const file of list) {
    const source = readFileSync(file, 'utf8')
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const visit = (node) => {
      if (ts.isJsxElement(node)) {
        const name = elementName(node.openingElement.tagName)
        if (INTERACTIVE.has(name)) {
          findNestedInteractive(sf, name, node, hits, path.relative(SRC, file))
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
  return hits
}

function format(hits) {
  return hits.map((h) => `${h.file}:${h.line} <${h.parent}> contains <${h.child}>`)
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  const asJson = process.argv.includes('--json')
  // Positional args = explicit files to lint (e.g. changed files from a PR).
  // No args → full scan of every src TSX file.
  const rawFiles = process.argv.slice(2).filter((a) => a !== '--json')
  const explicit = rawFiles.length ? rawFiles.filter(isScannable) : null
  const hits = scanJsxNesting(SRC, explicit)
  const scope = explicit ? `${explicit.length} scannable file(s)` : 'src JSX'

  if (hits.length === 0) {
    if (asJson) {
      process.stdout.write(JSON.stringify({ ok: true, hits: [] }))
    } else {
      process.stdout.write(`✓ no nested interactive elements in ${scope}\n`)
    }
    process.exit(0)
  }

  if (asJson) {
    process.stdout.write(JSON.stringify({ ok: false, hits }))
  } else {
    process.stderr.write(`✗ nested interactive elements found (${scope}):\n`)
    for (const line of format(hits)) process.stderr.write(`  ${line}\n`)
    process.stderr.write('Fix them — invalid HTML like <button> inside <button> or\n')
    process.stderr.write('a <Button> inside an <a> triggers React DOM nesting warnings.\n')
  }
  process.exit(1)
}
