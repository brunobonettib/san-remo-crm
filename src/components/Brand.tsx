export function Brand() {
  return (
    <div className="brand" aria-label="San Remo CRM Imobiliário">
      <svg
        className="brand-symbol"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 34V16L20 5l15 11v18M13 34V20l7-5 7 5v14M20 24v10M2 34h36"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
      <div>
        <span className="brand-name">
          SAN REMO<span className="brand-dot">.</span>
        </span>
        <span className="brand-caption">CRM IMOBILIÁRIO</span>
      </div>
    </div>
  )
}
