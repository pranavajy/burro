import { useCallback } from 'react'
import { Editor, Tldraw, TldrawOptions } from 'tldraw'
import { ConnectionBindingUtil } from './connection/ConnectionBindingUtil'
import { ConnectionShapeUtil } from './connection/ConnectionShapeUtil'
import { keepConnectionsAtBottom } from './connection/keepConnectionsAtBottom'
import { disableTransparency } from './disableTransparency'
import { layoutAllConversationTrees } from './nodes/layoutConversationTree'
import { NodeShapeUtil } from './nodes/NodeShapeUtil'
import { PointingPort } from './ports/PointingPort'
import { overrides } from './WorkflowToolbar'

const shapeUtils = [NodeShapeUtil, ConnectionShapeUtil]
const bindingUtils = [ConnectionBindingUtil]
const options: Partial<TldrawOptions> = {
	actionShortcutsLocation: 'menu',
	maxPages: 1,
}

export interface BurroEditorProps {
	persistenceKey?: string
	onMount?: (editor: Editor) => void
}

export function configureBurroEditor(editor: Editor) {
	if (!editor.getCurrentPageShapes().some((shape) => shape.type === 'node')) {
		const viewportCenter = editor.getViewportPageBounds().center
		editor.createShape({
			type: 'node',
			x: viewportCenter.x - 280,
			y: viewportCenter.y - 215,
		})
	}

	editor.user.updateUserPreferences({ isSnapMode: true, colorScheme: 'dark' })
	editor.updateInstanceState({ isGridMode: false })
	editor.getStateDescendant('select')?.addChild(PointingPort)
	editor.setCurrentTool('hand')
	keepConnectionsAtBottom(editor)
	disableTransparency(editor, ['node', 'connection'])
	layoutAllConversationTrees(editor)
}

export function BurroEditor({ persistenceKey, onMount }: BurroEditorProps) {
	const handleMount = useCallback((editor: Editor) => {
		configureBurroEditor(editor)
		onMount?.(editor)
	}, [onMount])

	return (
		<Tldraw
			persistenceKey={persistenceKey}
			colorScheme="dark"
			options={options}
			overrides={overrides}
			shapeUtils={shapeUtils}
			bindingUtils={bindingUtils}
			onMount={handleMount}
		/>
	)
}
