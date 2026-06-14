export default function Avatar({ name = '', color = '#6366f1', size = 'md', online = false }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const sz = { xs: 'w-7 h-7 text-[10px]', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl' }[size]
  const dot = { xs: 'w-1.5 h-1.5', sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3', xl: 'w-3.5 h-3.5' }[size]
  return (
    <div className="relative flex-shrink-0">
      <div className={`${sz} rounded-full flex items-center justify-center font-bold text-white select-none`}
        style={{ background: color }}>
        {initials || '?'}
      </div>
      {online !== null && (
        <span className={`absolute bottom-0 right-0 ${dot} rounded-full border-2 border-white dark:border-encr-900 ${online ? 'bg-success' : 'bg-encr-500'}`} />
      )}
    </div>
  )
}