import { createShapeId, Editor, TLShapeId } from 'tldraw'
import { TREE_COLUMN_GAP_PX } from '../constants'
import { createOrUpdateConnectionBinding } from '../connection/ConnectionBindingUtil'
import { getNextConnectionIndex } from '../connection/keepConnectionsAtBottom'
import { layoutConversationTree } from './layoutConversationTree'
import { getNodePortConnections, getNodePorts } from './nodePorts'
import { NodeShape } from './NodeShapeUtil'

interface SourceCardInput {
	id: string
	title: string
	url: string
	domain: string
	evidence: string
}

export function createSourceCard(editor: Editor, parentNodeId: TLShapeId, source: SourceCardInput) {
	for (const connection of getNodePortConnections(editor, parentNodeId)) {
		if (connection.terminal !== 'start') continue
		const child = editor.getShape<NodeShape>(connection.connectedShapeId)
		if (child?.props.node.type === 'source' && child.props.node.sourceId === source.id) {
			editor.select(child.id)
			return child.id
		}
	}

	const bounds = editor.getShapePageBounds(parentNodeId)
	if (!bounds) return
	const connectionId = createShapeId()
	const nodeId = createShapeId()

	editor.run(() => {
		editor.createShape({
			type: 'connection',
			id: connectionId,
			x: bounds.right,
			y: bounds.midY,
			index: getNextConnectionIndex(editor),
			props: { kind: 'source' },
		})
		createOrUpdateConnectionBinding(editor, connectionId, parentNodeId, {
			portId: 'output',
			terminal: 'start',
		})

		editor.createShape({
			type: 'node',
			id: nodeId,
			x: bounds.right + TREE_COLUMN_GAP_PX,
			y: bounds.midY,
			props: {
				node: {
					type: 'source',
					sourceId: source.id,
					title: source.title,
					url: source.url,
					domain: source.domain,
					evidence: source.evidence,
				},
			},
		})

		const inputPort = Object.values(getNodePorts(editor, nodeId)).find(
			(port) => port.terminal === 'end'
		)
		if (!inputPort) return
		editor.updateShape({
			id: nodeId,
			type: 'node',
			x: bounds.right + TREE_COLUMN_GAP_PX - inputPort.x,
			y: bounds.midY - inputPort.y,
		})
		createOrUpdateConnectionBinding(editor, connectionId, nodeId, {
			portId: inputPort.id,
			terminal: 'end',
		})
	})

	editor.select(nodeId)
	layoutConversationTree(editor, parentNodeId)
	return nodeId
}
