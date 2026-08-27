export function isSafeHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      url.protocol === "https:" && url.username === "" && url.password === ""
    )
  } catch {
    return false
  }
}

export function openTrustedUrl(value: string): void {
  const opened = window.open(value, "_blank", "noopener,noreferrer")
  if (opened) opened.opener = null
}
