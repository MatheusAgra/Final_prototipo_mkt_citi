import citiLogoGreen from "@/assets/citi-logo-green.png"

export default function BrandMark() {
  return (
    <div
      className="flex flex-col items-start flex-shrink-0"
      title="CITi HubSpot - Gerenciamento de Marketing"
    >
      <img
        src={citiLogoGreen}
        alt="CITi"
        className="h-[2.875rem] sm:h-[3.25rem] w-auto"
      />
      <span
        className="text-[15px] sm:text-[17px] mt-0.5"
        style={{
          color: "#FFFFFF",
          fontFamily: "'STIX Two Text', 'Inter', serif",
          fontStyle: "italic",
          fontWeight: 700,
          letterSpacing: "-0.01em",
        }}
      >
        HubSpot
      </span>
    </div>
  )
}
