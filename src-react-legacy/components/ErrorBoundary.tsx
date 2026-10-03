import { Component, ErrorInfo, ReactNode } from 'react'

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // ส่งไป error reporting service
    console.error('ErrorBoundary caught:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>เกิดข้อผิดพลาด</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            ลองใหม่
          </button>
        </div>
      )
    }
    
    return this.props.children
  }
}