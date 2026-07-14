import { createShapeId, Editor, TLShapeId } from 'tldraw'
import { TREE_COLUMN_GAP_PX } from '../constants'
import { createOrUpdateConnectionBinding } from '../connection/ConnectionBindingUtil'
import { getNextConnectionIndex } from '../connection/keepConnectionsAtBottom'
import {
	layoutConversationTree,
	TREE_LAYOUT_ANIMATION_MS,
} from './layoutConversationTree'
import { getNodePorts } from './nodePorts'

/** Create an empty follow-up card and attach it to a conversation node. */
export function createFollowUpNode(
	editor: Editor,
	parentNodeId: TLShapeId,
	initialNode: { userMessage?: string; autoSubmit?: boolean } = {}
) {
	const bounds = editor.getShapePageBounds(parentNodeId)
	if (!bounds) return

	const target = {
		x: bounds.right + TREE_COLUMN_GAP_PX,
		y: bounds.midY,
	}
	const connectionId = createShapeId()
	const nodeId = createShapeId()

	editor.run(() => {
		editor.createShape({
			type: 'connection',
			id: connectionId,
			x: bounds.right,
			y: bounds.top,
			index: getNextConnectionIndex(editor),
		})
		createOrUpdateConnectionBinding(editor, connectionId, parentNodeId, {
			portId: 'output',
			terminal: 'start',
		})

		editor.createShape({
			type: 'node',
			id: nodeId,
			x: target.x,
			y: target.y,
			props: {
				node: {
					type: 'message',
					userMessage: initialNode.userMessage ?? '',
					assistantMessage: '',
					images: [],
					autoSubmit: initialNode.autoSubmit,
				},
			},
		})

		const inputPort = Object.values(getNodePorts(editor, nodeId)).find(
			(port) => port.terminal === 'end'
		)
		if (!inputPort) {
			editor.deleteShapes([connectionId, nodeId])
			return
		}

		editor.updateShape({
			id: nodeId,
			type: 'node',
			x: target.x - inputPort.x,
			y: target.y - inputPort.y,
		})
		createOrUpdateConnectionBinding(editor, connectionId, nodeId, {
			portId: inputPort.id,
			terminal: 'end',
		})
	})

	editor.select(nodeId)
	layoutConversationTree(editor, parentNodeId)
	window.setTimeout(() => {
		if (!editor.getShape(nodeId)) return
		editor.select(nodeId)
		editor.zoomToSelection({ animation: { duration: editor.options.animationMediumMs } })
	}, TREE_LAYOUT_ANIMATION_MS)
	return nodeId
}
