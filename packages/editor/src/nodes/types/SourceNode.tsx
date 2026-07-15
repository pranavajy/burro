import { ExternalLink, FileText } from 'lucide-react'
import { T, useEditor } from 'tldraw'
import { NodeShape } from '../NodeShapeUtil'
import { NodeComponentProps, NodeDefinition, shapeInputPort } from './shared'

export type SourceNode = T.TypeOf<typeof SourceNode>
export const SourceNode = T.object({
	type: T.literal('source'),
	sourceId: T.string,
	title: T.string,
	url: T.string,
	domain: T.string,
	evidence: T.string,
})

const SOURCE_WIDTH = 420

export class SourceNodeDefinition extends NodeDefinition<SourceNode> {
	static type = 'source'
	static validator = SourceNode
	title = 'Source'
	heading = 'Source'
	icon = <FileText className="h-4 w-4 text-sky-400" />

	getDefault(): SourceNode {
		return { type: 'source', sourceId: '', title: 'Source', url: '', domain: '', evidence: '' }
	}

	getBodyWidthPx() {
		return SOURCE_WIDTH
	}

	getBodyHeightPx(_shape: NodeShape, node: SourceNode) {
		const evidence = node.evidence.trim()
		if (!evidence) return 168
		const size = this.editor.textMeasure.measureText(evidence, {
			fontFamily: 'Inter',
			fontSize: 13,
			fontWeight: '400',
			fontStyle: 'normal',
			maxWidth: SOURCE_WIDTH - 48,
			lineHeight: 1.55,
			padding: '0px',
		})
		return 168 + Math.min(size.h, 82)
	}

	getPorts(shape: NodeShape, node: SourceNode) {
		return {
			input: {
				...shapeInputPort,
				x: 0,
				y: this.getBodyHeightPx(shape, node) / 2,
			},
		}
	}

	Component = SourceNodeComponent
}

function SourceNodeComponent({ node }: NodeComponentProps<SourceNode>) {
	const editor = useEditor()
	return (
		<div className="pointer-events-auto h-full w-full overflow-hidden rounded-[24px] border border-sky-400/15 bg-[#15191C] shadow-[0_14px_42px_rgba(0,0,0,0.48)]">
			<div className="flex h-9 cursor-grab items-center justify-between border-b border-sky-400/10 px-5 active:cursor-grabbing">
				<span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-sky-400/80">Source evidence</span>
				<span className="max-w-[180px] truncate text-[10px] text-zinc-600">{node.domain}</span>
			</div>
			<div className="px-6 py-5">
				<div className="line-clamp-2 text-[16px] font-semibold leading-6 text-zinc-100">{node.title}</div>
				{node.evidence && (
					<div className="mt-3 line-clamp-3 border-l-2 border-sky-400/25 pl-3 text-[13px] leading-[1.55] text-zinc-400">
						{node.evidence}
					</div>
				)}
				<button
					type="button"
					onPointerDown={editor.markEventAsHandled}
					onClick={() => window.open(node.url, '_blank', 'noopener,noreferrer')}
					className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-sky-400 transition-colors hover:text-sky-300"
				>
					Open source <ExternalLink className="h-3 w-3" />
				</button>
			</div>
		</div>
	)
}
