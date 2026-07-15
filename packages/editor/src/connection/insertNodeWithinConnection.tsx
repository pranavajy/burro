import { createShapeId, Editor } from 'tldraw'
import { DEFAULT_NODE_SPACING_PX, NODE_HEIGHT_PX, NODE_WIDTH_PX } from '../constants'
import { layoutConversationTree } from '../nodes/layoutConversationTree'
import { getNodePorts } from '../nodes/nodePorts'
import { createOrUpdateConnectionBinding, getConnectionBindings } from './ConnectionBindingUtil'
import { ConnectionShape } from './ConnectionShapeUtil'

/**
 * Insert a node in the middle of a connection.
 *
 * This is used when the user clicks the center handle of a connection shape.
 */
export function insertNodeWithinConnection(
	editor: Editor,
	connection: ConnectionShape,
	direction: 'horizontal' | 'vertical' = 'horizontal'
) {
	// mark the history so we can undo this operation
	const mark = editor.markHistoryStoppingPoint()

	// get the original bindings of the connection
	const originalBindings = getConnectionBindings(editor, connection)

	// if the connection doesn't have bindings, we can't insert a node in the middle of it
	if (!originalBindings.start || !originalBindings.end) return

	// find the ideal position for the new node based on direction:
	const startBounds = editor.getShapePageBounds(originalBindings.start.toId)!
	const endBounds = editor.getShapePageBounds(originalBindings.end.toId)!

	let newNodeX: number, newNodeY: number

	if (direction === 'horizontal') {
		// horizontal layout: nodes flow left to right
		newNodeY = (startBounds.top + endBounds.top) / 2
		const newNodeIdealX = (startBounds.right + endBounds.left - NODE_WIDTH_PX) / 2
		const newNodeMin = startBounds.right + DEFAULT_NODE_SPACING_PX
		newNodeX = Math.max(newNodeIdealX, newNodeMin)
	} else {
		// vertical layout: nodes flow top to bottom
		newNodeX = (startBounds.left + endBounds.left) / 2
		if (startBounds.top > endBounds.bottom) {
			const newNodeIdealY = (startBounds.top + endBounds.bottom - NODE_HEIGHT_PX) / 2
			const newNodeMin = endBounds.bottom + DEFAULT_NODE_SPACING_PX
			newNodeY = Math.max(newNodeIdealY, newNodeMin)
		} else {
			const newNodeIdealY = (startBounds.bottom + endBounds.top - NODE_HEIGHT_PX) / 2
			const newNodeMin = startBounds.bottom + DEFAULT_NODE_SPACING_PX
			newNodeY = Math.max(newNodeIdealY, newNodeMin)
		}
	}

	// create the new node
	const newNodeId = createShapeId()
	editor.createShape({
		type: 'node',
		id: newNodeId,
		x: newNodeX,
		y: newNodeY,
		props: { node: { type: 'message', userMessage: '', assistantMessage: '' } },
	})

	// now, we need to connect up the new node.
	// first, lets find the first input and output port on the new node.
	const ports = getNodePorts(editor, newNodeId)
	const firstInputPort = Object.values(ports).find((p) => p.terminal === 'end')
	const firstOutputPort = Object.values(ports).find((p) => p.terminal === 'start')
	if (!firstInputPort || !firstOutputPort) {
		editor.bailToMark(mark)
		return
	}

	// update the existing connection to connect to the input of our new node
	createOrUpdateConnectionBinding(editor, connection, newNodeId, {
		portId: firstInputPort.id,
		terminal: 'end',
	})

	// create a new connection between the new node and the end of the original connection
	const newConnectionId = createShapeId()
	editor.createShape({
		type: 'connection',
		id: newConnectionId,
	})
	createOrUpdateConnectionBinding(editor, newConnectionId, newNodeId, {
		portId: firstOutputPort.id,
		terminal: 'start',
	})
	createOrUpdateConnectionBinding(editor, newConnectionId, originalBindings.end.toId, {
		portId: originalBindings.end.props.portId,
		terminal: 'end',
	})

	// Reflow the whole conversation instead of locally nudging one card. This
	// keeps sibling branches aligned even when the inserted card is very tall.
	layoutConversationTree(editor, newNodeId)

	// select the new node
	editor.select(newNodeId)

	// update the pointer so that e.g. the editor's internal hovered shape id is correct
	editor.updatePointer()
}
