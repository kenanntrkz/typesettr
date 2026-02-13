import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
          <div className="text-center max-w-md p-8">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: 'hsl(0, 60%, 94%)' }}
            >
              <span className="text-2xl" role="img" aria-label="Hata">!</span>
            </div>
            <h1
              className="text-2xl font-bold mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Bir hata olustu
            </h1>
            <p className="mb-6" style={{ color: 'hsl(30, 10%, 45%)' }}>
              Beklenmeyen bir hata meydana geldi. Sayfayi yeniden yuklemeyi deneyin.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-colors"
            >
              Sayfayi Yenile
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
