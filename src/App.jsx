import { useState, useEffect, useMemo } from 'react'

const STORAGE_KEY = 'freelancer-revenue-data'
const SOURCES = ['Upwork', 'Fiverr', 'Direct', 'Other']
const SOURCE_COLORS = {
  'Upwork': { bg: 'bg-green-100', text: 'text-green-700', icon: '💼' },
  'Fiverr': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '🎯' },
  'Direct': { bg: 'bg-blue-100', text: 'text-blue-700', icon: '🤝' },
  'Other': { bg: 'bg-purple-100', text: 'text-purple-700', icon: '📋' }
}
const TAX_RATE = 0.25

function App() {
  const [entries, setEntries] = useState([])
  const [form, setForm] = useState({ source: 'Upwork', amount: '', client: '', project: '', date: '' })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sourceFilter, setSourceFilter] = useState('All')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setEntries(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  }, [entries])

  const addEntry = (e) => {
    e.preventDefault()
    if (!form.amount || !form.client || !form.date) return
    
    if (editingId) {
      setEntries(entries.map(e => e.id === editingId ? { ...form, amount: parseFloat(form.amount), id: editingId } : e))
      setEditingId(null)
    } else {
      const entry = { ...form, amount: parseFloat(form.amount), id: Date.now() }
      setEntries([...entries, entry])
    }
    
    setForm({ source: 'Upwork', amount: '', client: '', project: '', date: '' })
    setShowForm(false)
  }

  const editEntry = (entry) => {
    setForm({ ...entry })
    setEditingId(entry.id)
    setShowForm(true)
  }

  const deleteEntry = (id) => {
    setEntries(entries.filter(e => e.id !== id))
  }

  const exportCSV = () => {
    const headers = ['Date', 'Client', 'Project', 'Source', 'Amount']
    const rows = entries.map(e => [
      new Date(e.date).toLocaleDateString(),
      e.client,
      e.project,
      e.source,
      e.amount
    ])
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `revenue-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getCurrentMonthRevenue = () => {
    const now = new Date()
    return entries
      .filter(e => {
        const d = new Date(e.date)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((sum, e) => sum + e.amount, 0)
  }

  const getLastMonthRevenue = () => {
    const now = new Date()
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    return entries
      .filter(e => {
        const d = new Date(e.date)
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear
      })
      .reduce((sum, e) => sum + e.amount, 0)
  }

  const getMonthlyData = () => {
    const months = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEntries = entries.filter(e => {
        const ed = new Date(e.date)
        return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear()
      })
      months.push({ month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), revenue: monthEntries.reduce((s, e) => s + e.amount, 0) })
    }
    return months
  }

  const getClientBreakdown = () => {
    const breakdown = {}
    entries.forEach(e => {
      breakdown[e.client] = (breakdown[e.client] || 0) + e.amount
    })
    return Object.entries(breakdown).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }

  const getQuarterlyRevenue = () => {
    const now = new Date()
    const quarter = Math.floor(now.getMonth() / 3)
    const quarterEntries = entries.filter(e => {
      const d = new Date(e.date)
      return Math.floor(d.getMonth() / 3) === quarter && d.getFullYear() === now.getFullYear()
    })
    return quarterEntries.reduce((s, e) => s + e.amount, 0)
  }

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const matchesSearch = !searchTerm || 
        e.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.project.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesSource = sourceFilter === 'All' || e.source === sourceFilter
      return matchesSearch && matchesSource
    })
  }, [entries, searchTerm, sourceFilter])

  const currentMonth = getCurrentMonthRevenue()
  const lastMonth = getLastMonthRevenue()
  const percentChange = lastMonth > 0 ? ((currentMonth - lastMonth) / lastMonth * 100).toFixed(1) : currentMonth > 0 ? 100 : 0
  const monthlyData = getMonthlyData()
  const maxRevenue = Math.max(...monthlyData.map(d => d.revenue), 1)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Freelancer Revenue Tracker</h1>
          <div className="flex gap-3">
            {entries.length > 0 && (
              <button onClick={exportCSV} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition text-sm flex items-center gap-2">
                <span>📥</span> Export CSV
              </button>
            )}
            <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ source: 'Upwork', amount: '', client: '', project: '', date: '' }) }} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition flex items-center gap-2">
              <span>{showForm ? '✕' : '+'}</span> {showForm ? 'Cancel' : 'Add Income'}
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={addEntry} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="border rounded-lg p-3">
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="number" placeholder="Amount ($)" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="border rounded-lg p-3" step="0.01" required />
              <input type="text" placeholder="Client name" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} className="border rounded-lg p-3" required />
              <input type="text" placeholder="Project name" value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} className="border rounded-lg p-3" />
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="border rounded-lg p-3" required />
            </div>
            <div className="mt-4 flex gap-3">
              <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition">
                {editingId ? '✏️ Update Entry' : '💾 Save Entry'}
              </button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setForm({ source: 'Upwork', amount: '', client: '', project: '', date: '' }); setShowForm(false) }} className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition">
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        )}

        {/* Search & Filter Bar */}
        {entries.length > 0 && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <input 
                type="text" 
                placeholder="🔍 Search clients or projects..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full border rounded-lg p-2 pl-10"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'%239ca3af\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: '10px center', backgroundSize: '18px' }}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setSourceFilter('All')} className={`px-3 py-1.5 rounded-lg text-sm transition ${sourceFilter === 'All' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All Sources</button>
              {SOURCES.map(s => (
                <button key={s} onClick={() => setSourceFilter(s)} className={`px-3 py-1.5 rounded-lg text-sm transition flex items-center gap-1 ${sourceFilter === s ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {SOURCE_COLORS[s].icon} {s}
                </button>
              ))}
            </div>
            <div className="text-sm text-gray-500">
              {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
            </div>
          </div>
        )}

        {/* Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <p className="text-gray-500 text-sm mb-1">This Month</p>
            <p className="text-3xl font-bold text-gray-800">${currentMonth.toLocaleString()}</p>
            <p className={`text-sm mt-2 ${percentChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {percentChange >= 0 ? '↑' : '↓'} {Math.abs(percentChange)}% vs last month
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <p className="text-gray-500 text-sm mb-1">Quarterly Revenue</p>
            <p className="text-3xl font-bold text-gray-800">${getQuarterlyRevenue().toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-2">Est. taxes (25%): ${(getQuarterlyRevenue() * TAX_RATE).toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <p className="text-gray-500 text-sm mb-1">Total Earned</p>
            <p className="text-3xl font-bold text-gray-800">${entries.reduce((s, e) => s + e.amount, 0).toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-2">{entries.length} {entries.length === 1 ? 'project' : 'projects'}</p>
          </div>
        </div>

        {/* Monthly Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Monthly Revenue</h2>
          <div className="flex items-end gap-2 h-56">
            {monthlyData.map((m, i) => {
              const heightPct = Math.max((m.revenue / maxRevenue) * 100, 2)
              const isCurrentMonth = i === monthlyData.length - 1
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div 
                    className={`w-full rounded-t transition-all duration-300 ${isCurrentMonth ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-emerald-300'}`} 
                    style={{ height: `${heightPct}%`, minHeight: '8px' }}
                  ></div>
                  <p className={`text-xs mt-2 ${isCurrentMonth ? 'text-emerald-600 font-semibold' : 'text-gray-500'}`}>{m.month}</p>
                  <p className={`text-xs font-medium ${isCurrentMonth ? 'text-emerald-700' : 'text-gray-600'}`}>${m.revenue.toLocaleString()}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Client Breakdown */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Top Clients</h2>
            {getClientBreakdown().length === 0 ? (
              <p className="text-gray-500">No clients yet</p>
            ) : (
              <div className="space-y-3">
                {getClientBreakdown().map(([client, total], i) => (
                  <div key={client} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {i + 1}
                      </span>
                      <span className="font-medium text-gray-700">{client}</span>
                    </div>
                    <span className="text-gray-800 font-semibold">${total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Entries */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {searchTerm || sourceFilter !== 'All' ? 'Filtered Entries' : 'Recent Entries'}
            </h2>
            {filteredEntries.length === 0 ? (
              entries.length === 0 ? (
                <p className="text-gray-500">No entries yet</p>
              ) : (
                <p className="text-gray-500">No entries match your filter</p>
              )
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {[...filteredEntries].reverse().slice(0, 10).map(e => {
                  const sourceStyle = SOURCE_COLORS[e.source] || SOURCE_COLORS['Other']
                  return (
                    <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-700">{e.client}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${sourceStyle.bg} ${sourceStyle.text}`}>
                            {sourceStyle.icon} {e.source}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{e.project || 'No project'} • {new Date(e.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right flex items-center gap-2 ml-2">
                        <p className="font-semibold text-gray-800">${e.amount.toLocaleString()}</p>
                        <button onClick={() => editEntry(e)} className="text-xs text-blue-500 hover:text-blue-700 px-1">Edit</button>
                        <button onClick={() => deleteEntry(e.id)} className="text-xs text-red-500 hover:text-red-700 px-1">Delete</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
