import React from "react"

export type RichTextLinkNode = {
  text: string
  href: string
  external?: boolean
}

export type RichTextNode = string | RichTextLinkNode
export type RichTextContent = RichTextNode | Array<RichTextNode>

interface EpsRichTextProps {
  content: RichTextContent
}

export default function EpsRichText({content}: EpsRichTextProps) {
  const nodes = Array.isArray(content) ? content : [content]
  return (
    <>
      {nodes.map((node, i) =>
        typeof node === "string" ? (
          <React.Fragment key={i}>{node}</React.Fragment>
        ) : (
          <a
            key={i}
            href={node.href}
            {...(node.external ? {target: "_blank", rel: "noreferrer"} : {})}
          >
            {node.text}
          </a>
        )
      )}
    </>
  )
}
