import { useState } from "react"
import type { Channel } from "@/app/App"
import BrandMark from "@/shared/ui/BrandMark"
import { usePosts } from "./posts"
import { TabNav, type Tab } from "./components/shared"
import { MaterialsView } from "./materials/MaterialsFeature"
import { PostsView } from "./posts/PostsFeature"
import { PromptsView } from "./prompts/PromptsFeature"

interface Props { channel: Channel; setChannel: (channel: Channel) => void }

export default function LibraryPage({ channel, setChannel }: Props) {
  const [tab, setTab] = useState<Tab>("posts")
  const { posts, setPosts } = usePosts()

  return <div className="flex flex-col h-full">
    <header className="page-header bg-[#17171A] flex-shrink-0" style={{ borderBottom: "1.5px solid rgba(255,255,255,0.1)" }}>
      <div className="px-4 md:px-6 pt-4 md:pt-5 pb-0 flex items-start gap-4"><BrandMark /><div><span className="page-eyebrow">Acervo de conteúdo</span><h1 className="text-lg md:text-xl font-semibold text-[#F0F0F5] leading-tight">Biblioteca</h1><p className="text-xs md:text-sm text-[#8A8A9A] mt-0.5 hidden sm:block">Posts publicados, materiais ricos e biblioteca de prompts</p></div></div>
      <div className="px-4 md:px-6 pt-2 md:pt-3 pb-0 overflow-x-auto"><TabNav active={tab} setTab={setTab} /></div>
    </header>
    <div className="module-stage flex-1 overflow-hidden">
      {tab === "posts" && <PostsView channel={channel} setChannel={setChannel} posts={posts} setPosts={setPosts} />}
      {tab === "materiais" && <MaterialsView />}
      {tab === "prompts" && <PromptsView />}
    </div>
  </div>
}
