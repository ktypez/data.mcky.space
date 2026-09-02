class SmartAPIClient {
  private retryQueue: Array<() => Promise<any>> = []
  private retrying = false
  
  async request<T>(url: string, options?: RequestInit, parser?: (res: Response) => Promise<T>): Promise<T> {
    return this.executeWithRetry(async () => {
      const res = await fetch(url, options)
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      return parser ? parser(res) : res.json()
    }, 3)
  }
  
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number,
    delay = 1000
  ): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      if (maxRetries <= 0) throw error
      
      // เก็บ request ไว้ก่อน
      this.retryQueue.push(() => this.executeWithRetry(fn, maxRetries - 1, delay * 2))
      
      if (!this.retrying) {
        this.retrying = true
        setTimeout(() => this.processRetryQueue(), delay)
      }
      
      throw error
    }
  }
  
  private async processRetryQueue() {
    if (this.retryQueue.length === 0) {
      this.retrying = false
      return
    }
    
    const retries = this.retryQueue.splice(0)
    const results = await Promise.allSettled(retries.map(fn => fn()))
    
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Retry ${index} failed:`, result.reason)
      }
    })
    
    this.retrying = false
    this.processRetryQueue() // วนใหม่ในกรณีที่มี retry ใหม่เพิ่ม
  }
}

export const apiClient = new SmartAPIClient()