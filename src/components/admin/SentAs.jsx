// Who a mail is sent as: "Name <address>" when the alert's sender has a display name, else just the address (what recipients see).
export default function SentAs({ name, address }) {
  if (!address && !name) return <span className="text-muted-foreground">—</span>
  if (!name) return <span className="break-all">{address}</span>
  return <span className="break-words">{name} <span className="break-all text-muted-foreground">&lt;{address}&gt;</span></span>
}
