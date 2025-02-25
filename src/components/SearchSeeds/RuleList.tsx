import React, { FC, useContext } from 'react';
import {
	Container,
	Stack,
	Row,
	Col,
	Card,
	ListGroup,
	Button,
	ButtonGroup,
	Dropdown,
	DropdownButton
} from 'react-bootstrap';
import { useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import {
	DndProvider,
	MouseTransition,
	TouchTransition
} from 'react-dnd-multi-backend';
import mergeRefs from 'react-merge-refs';

import {
	IRule,
	ILogicRules,
	RuleType
} from '../../services/SeedInfo/infoHandler/IRule';
import SeedDataOutput from '../SeedInfo/SeedDataOutput';
import { getTreeTools } from './node';
import classNames from 'classnames';
import SearchContextProvider, { SearchContext } from './SearchContext';
import RuleConstructor, { RuleConstructors } from './RuleConstructor';

const treeTools = getTreeTools('id', 'rules');



type IIDRule = IRule & { id: string };

interface IRuleProps extends IIDRule {
	deletable?: boolean;
	draggable?: boolean;
	onClick?: () => void;
	onDelete?: () => void;
}
const Rule: FC<IRuleProps> = ({ id, type, deletable, draggable }) => {
	const rc = RuleConstructors[type] || {};
	const { ruleDispatch, ruleTree } = useContext(SearchContext);
	const [collected, drag, dragPreview] = useDrag(
		() => ({
			type: 'rule',
			item: { id }
		}),
		[id, type, deletable, draggable]
	);

	const active = ruleTree.selectedRule === id;

	const handleDelete = () => {
		ruleDispatch({ action: 'delete', data: id });
	};
	const handleClick = () => {
		ruleDispatch({ action: 'select', data: id });
	};

	return (
		<Stack
			direction="horizontal"
			gap={2}
			className="align-items-center"
			ref={dragPreview}
			{...collected as any}
		>
			{draggable && <i className="bi bi-grip-vertical" ref={drag}></i>}
			<ListGroup.Item
				active={active}
				action
				onClick={handleClick}
				className="rounded"
			>
				<div>{rc.Title()}</div>
			</ListGroup.Item>
			{deletable && (
				<Button onClick={handleDelete} size="sm" variant="outline-warning">
					<i className="bi bi-x"></i>
				</Button>
			)}
		</Stack>
	);
};

interface ILogicRuleProps extends ILogicRules {
	deletable?: boolean;
	draggable?: boolean;
}
const LogicRule: FC<ILogicRuleProps> = ({
	type,
	id,
	rules,
	deletable,
	draggable
}) => {
	const { ruleDispatch } = useContext(SearchContext);
	const handleDelete = () => {
		ruleDispatch({ action: 'delete', data: id });
	};
	const [dragProps, dragRef, dragPreviewRef] = useDrag(
		() => ({
			type: 'rule',
			item: { id },
			collect: monitor => ({
				isDragging: monitor.isDragging()
			})
		}),
		[id, type, rules, deletable, draggable]
	);

	const [dropProps, dropRef] = useDrop(
		() => ({
			accept: 'rule',
			drop: (item: any, monitor) => {
				const didDrop = monitor.didDrop();
				if (didDrop) {
					return;
				}
				if (type === RuleType.NOT && rules.length > 0) {
					return false;
				}
				if (item.id === id) {
					// dropped into self
					return;
				}
				ruleDispatch({
					action: 'move',
					data: {
						source: item.id,
						dest: id
					}
				});
			},
			canDrop: (item, monitor) => {
				if (item.id === id) {
					return false;
				}
				if (type === RuleType.NOT && rules.length > 0) {
					return false;
				}
				return true;
			},
			collect: monitor => ({
				canDrop: monitor.canDrop() && monitor.isOver({ shallow: true })
			})
		}),
		[id, type, rules, deletable, draggable]
	);
	const rule = RuleConstructors[type];
	return (
		<Card
			style={{ transition: '0.16s' }}
			className={classNames(
				'p-3 pe-2 shadow-sm',
				dropProps.canDrop && 'bg-info',
				dragProps.isDragging && 'bg-secondary'
			)}
			ref={mergeRefs([dropRef, dragPreviewRef])}
		>
			<Stack direction="horizontal" gap={2} className="align-items-center">
				{draggable && <i className="bi bi-grip-vertical" ref={dragRef}></i>}
				{rule.Title()}
				<div className="ms-auto"></div>
				{deletable && (
					<Button onClick={handleDelete} size="sm" variant="outline-warning">
						<i className="bi bi-x"></i>
					</Button>
				)}
			</Stack>
			<hr />
			<Stack gap={2}>
				{rules.map(r => {
					if (r.type !== RuleType.RULES && r.rules) {
						return <LogicRule deletable draggable key={r.id} {...r} />;
					}
					return <Rule deletable draggable key={r.id} {...r} />;
				})}
			</Stack>
		</Card>
	);
};

interface IAddProps {
	onAdd: (type: string) => void;
}
const Add: FC<IAddProps> = ({ onAdd }) => {
	const rules = Object.keys(RuleConstructors).filter(
		k => !['search', RuleType.AND, RuleType.OR, RuleType.NOT].includes(k)
	);

	return (
		<DropdownButton
			className="w-100"
			variant="outline-primary"
			as={ButtonGroup}
			id="dropdown-item-button"
			title="Add new rule"
		>
			{rules.map(r => {
				const rule = RuleConstructors[r];
				return (
					<Dropdown.Item key={r} onClick={() => onAdd(r)} as="button">
						{rule.Title()}
					</Dropdown.Item>
				);
			})}
		</DropdownButton>
	);
};

const LogicConstructors = {
	[RuleType.AND]: {
		Title: () => 'And',
		type: RuleType.AND
	},
	[RuleType.OR]: {
		Title: () => 'Or',
		type: RuleType.OR
	},
	[RuleType.NOT]: {
		Title: () => 'Not',
		type: RuleType.NOT
	}
};
interface ILogicProps {
	onLogic: (type: string) => void;
}
const Logic: FC<ILogicProps> = ({ onLogic }) => {
	const rules = Object.keys(LogicConstructors);

	return (
		<DropdownButton
			className="w-100"
			variant="outline-primary"
			as={ButtonGroup}
			id="dropdown-item-button"
			title="Add logic"
		>
			{rules.map(r => {
				const rule = LogicConstructors[r];
				return (
					<Dropdown.Item key={r} onClick={() => onLogic(r)} as="button">
						{rule.Title()}
					</Dropdown.Item>
				);
			})}
		</DropdownButton>
	);
};

interface IRuleListProps {}
const RuleList: FC<IRuleListProps> = () => {
	const { ruleTree, ruleDispatch } = useContext(SearchContext);
	return (
		<DndProvider
			options={{
				backends: [
					{
						id: 'html5',
						backend: HTML5Backend,
						transition: MouseTransition
					},
					{
						id: 'touch',
						backend: TouchBackend,
						options: {
							enableMouseEvents: true
						},
						preview: true,
						transition: TouchTransition
					}
				]
			}}
		>
			<ListGroup className="py-2">
				<Rule
					onClick={() => ruleDispatch({ action: 'select', data: 'search' })}
					id="search"
					type="search"
				/>
				<hr />
				<LogicRule {...ruleTree} />
				<hr />
				<Row lg={1} xl={2} className="d-flex justify-content-between">
					<Col className="my-2" xs={12}>
						<Add
							onAdd={type => ruleDispatch({ action: 'add', data: { type } })}
						/>
					</Col>
					<Col className="my-2" xs={12}>
						<Logic
							onLogic={type => ruleDispatch({ action: 'add', data: { type } })}
						/>
					</Col>
				</Row>
			</ListGroup>
		</DndProvider>
	);
};

export default RuleList;
