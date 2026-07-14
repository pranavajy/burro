import { Editor, TLShapeId } from 'tldraw'
import { TREE_BRANCH_GAP_PX, TREE_COLUMN_GAP_PX } from '../constants'
import { NodeShape } from './NodeShapeUtil'
import { getNodePortConnections, NodePortConnection } from './nodePorts'

interface TreeMeasurement {
	node: NodeShape
	width: number
	height: number
	subtreeHeight: number
	children: TreeMeasurement[]
}

/**
 * Arrange the connected conversation as a stable left-to-right tree.
 *
 * The root stays anchored in place. Every generation gets its own column and
 * siblings are stacked vertically, centred on their parent. Subtree heights
 * are measured recursively so deeper branches never overlap adjacent ones.
 */
export function layoutConversationTree(editor: Editor, fromNodeId: TLShapeId, animate = true) {
	const root = findRoot(editor, fromNodeId)
	if (!root) return

	const rootBounds = editor.getShapePageBounds(root)
	if (!rootBounds) return

	const tree = measureTree(editor, root, new Set())
	if (!tree) return

	const updates: Array<{ id: TLShapeId; type: 'node'; x: number; y: number }> = []
	const rootCenterY = rootBounds.midY
	placeTree(tree, rootBounds.left, rootCenterY - tree.subtreeHeight / 2, updates)

	if (animate) {
		editor.animateShapes(updates, { animation: { duration: 180 } })
	} else {
		editor.updateShapes(updates)
	}
}

/** Normalize persisted conversations that were created with the old free-form layout. */
export function layoutAllConversationTrees(editor: Editor, animate = false) {
	const nodes = editor
		.getCurrentPageShapes()
		.filter((shape): shape is NodeShape => editor.isShapeOfType(shape, 'node'))

	for (const node of nodes) {
		const hasParent = getNodePortConnections(editor, node).some(
			(connection) => connection.terminal === 'end'
		)
		if (!hasParent) layoutConversationTree(editor, node.id, animate)
	}
}

function findRoot(editor: Editor, nodeId: TLShapeId): NodeShape | undefined {
	let current = editor.getShape<NodeShape>(nodeId)
	if (!current || !editor.isShapeOfType(current, 'node')) return

	const seen = new Set<TLShapeId>()
	while (!seen.has(current.id)) {
		seen.add(current.id)
		const parentConnection: NodePortConnection | undefined = getNodePortConnections(editor, current).find(
			(connection) => connection.terminal === 'end'
		)
		if (!parentConnection) return current

		const parent: NodeShape | undefined = editor.getShape<NodeShape>(
			parentConnection.connectedShapeId
		)
		if (!parent || !editor.isShapeOfType(parent, 'node')) return current
		current = parent
	}

	return current
}

function measureTree(
	editor: Editor,
	node: NodeShape,
	visited: Set<TLShapeId>
): TreeMeasurement | undefined {
	if (visited.has(node.id)) return
	visited.add(node.id)

	const bounds = editor.getShapePageBounds(node)
	if (!bounds) return

	const children = getNodePortConnections(editor, node)
		.filter((connection) => connection.terminal === 'start')
		.map((connection) => editor.getShape<NodeShape>(connection.connectedShapeId))
		.filter((child): child is NodeShape => !!child && editor.isShapeOfType(child, 'node'))
		.sort((a, b) => a.y - b.y)
		.map((child) => measureTree(editor, child, visited))
		.filter((child): child is TreeMeasurement => !!child)

	const childrenHeight = children.reduce((total, child) => total + child.subtreeHeight, 0)
	const branchGaps = Math.max(0, children.length - 1) * TREE_BRANCH_GAP_PX

	return {
		node,
		width: bounds.width,
		height: bounds.height,
		children,
		subtreeHeight: Math.max(bounds.height, childrenHeight + branchGaps),
	}
}

function placeTree(
	tree: TreeMeasurement,
	x: number,
	subtreeTop: number,
	updates: Array<{ id: TLShapeId; type: 'node'; x: number; y: number }>
) {
	updates.push({
		id: tree.node.id,
		type: 'node',
		x,
		y: subtreeTop + (tree.subtreeHeight - tree.height) / 2,
	})

	if (tree.children.length === 0) return

	const childrenHeight =
		tree.children.reduce((total, child) => total + child.subtreeHeight, 0) +
		(tree.children.length - 1) * TREE_BRANCH_GAP_PX
	let childTop = subtreeTop + (tree.subtreeHeight - childrenHeight) / 2
	const childX = x + tree.width + TREE_COLUMN_GAP_PX

	for (const child of tree.children) {
		placeTree(child, childX, childTop, updates)
		childTop += child.subtreeHeight + TREE_BRANCH_GAP_PX
	}
}
