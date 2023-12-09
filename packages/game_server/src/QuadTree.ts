import { Locatable } from "./Locatable";

const QUAD_TREE_THRESHOLD = 4;
const QUAD_TREE_MAX_DEPTH = 3;

/**
 * Manages a collection of points on a 2D plane.
 * Each point is an object that must define x and y.
 * The position of an object must not be changed without
 * first removing and then reinserting it.
 */
export class QuadTree<T extends Locatable> {
	public centerX: number;
	public centerY: number;
	public extentX: number; // extentX * 2 = rectangle width
	public extentY: number; // extentY * 2 = rectangle height
	public depth: number;
	public isLeaf: boolean;
	public objects: T[]; // empty if this isn't a leaf node
	public children: QuadTree<T>[]; // empty if this is a leaf

	constructor(centerX: number, centerY: number, extentX: number, extentY: number, depth: number = 0) {
		this.centerX = centerX;
		this.centerY = centerY;
		this.extentX = extentX;
		this.extentY = extentY;
		this.depth = depth;
		this.isLeaf = true;
		this.objects = [];
		this.children = [];
	}

	insert(object: T) {
		if (this.isLeaf) {
			this.objects.push(object);
			if (this.objects.length > QUAD_TREE_THRESHOLD) {
				if (this.depth < QUAD_TREE_MAX_DEPTH) {
					this._splitNode();
				}
			}
		} else {
			this.children[this._getQuadrantOfPoint(object.x, object.y)].insert(object);
		}
	}

	remove(object: T) {
		if (this.isLeaf) {
			const index = this.objects.indexOf(object);
			if (index !== -1) {
				this.objects.splice(index, 1);
			}
		} else {
			this.children[this._getQuadrantOfPoint(object.x, object.y)].remove(object);

			if (this._nodeCanBeMerged()) {
				this._mergeNode();
			}
		}
	}

	findObjectsInCenteredRect(rectCenterX: number, rectCenterY: number, rectExtentX: number, rectExtentY: number): T[] {
		if (!centeredRectanglesIntersect(
				rectCenterX, rectCenterY, rectExtentX, rectExtentY,
				this.centerX, this.centerY, this.extentX, this.extentY)) {
			return [];
		}

		let objectsFound: T[] = [];

		if (this.isLeaf) {
			for (const object of this.objects) {
				if (centeredRectangleContainsPoint(
						rectCenterX, rectCenterY, rectExtentX, rectExtentY, object.x, object.y)) {
					objectsFound.push(object);
				}
			}
		} else {
			for (const childNode of this.children) {
				const newObjectsFound = childNode.findObjectsInCenteredRect(
					rectCenterX, rectCenterY, rectExtentX, rectExtentY);
				objectsFound = objectsFound.concat(newObjectsFound);
			}
		}

		return objectsFound;
	}

	_splitNode() {
		this.children = [];

		const halfExtentX = this.extentX / 2;
		const halfExtentY = this.extentY / 2;

		for (const signY of [-1, 1]) {
			for (const signX of [-1, 1]) {
				const childNode = new QuadTree<T>(
					this.centerX + signX * halfExtentX,
					this.centerY + signY * halfExtentY,
					halfExtentX, halfExtentY, this.depth + 1);
				this.children.push(childNode);
			}
		}

		for (const object of this.objects) {
			this.children[this._getQuadrantOfPoint(object.x, object.y)].insert(object);
		}

		this.objects = [];
		this.isLeaf = false;
	}

	_nodeCanBeMerged() {
		if (this.isLeaf) {
			return false;
		}

		const allChildrenAreLeafs = this.children.every(childNode => childNode.isLeaf);
		if (!allChildrenAreLeafs) {
			return false;
		}

		let combinedChildNodeObjectCount = 0;
		for (const childNode of this.children) {
			combinedChildNodeObjectCount += childNode.objects.length;
		}

		return combinedChildNodeObjectCount <= QUAD_TREE_THRESHOLD;
	}

	_mergeNode(): void {
		this.objects = [];

		for (const childNode of this.children) {
			this.objects = this.objects.concat(childNode.objects);
		}

		this.children = [];
		this.isLeaf = true;
	}

	_getQuadrantOfPoint(x: number, y: number): number {
		return (y >= this.centerY ? 2 : 0) + (x >= this.centerX ? 1 : 0);
	}
}

function centeredRectangleContainsPoint(
		rectCenterX: number, rectCenterY: number, rectExtentX: number, rectExtentY: number, pointX: number, pointY: number): boolean {
	return (Math.abs(pointX - rectCenterX) < rectExtentX)
		&& (Math.abs(pointY - rectCenterY) < rectExtentY);
}

function centeredRectanglesIntersect(
		rect1CenterX: number, rect1CenterY: number, rect1ExtentX: number, rect1ExtentY: number,
		rect2CenterX: number, rect2CenterY: number, rect2ExtentX: number, rect2ExtentY: number): boolean {
	return (Math.abs(rect1CenterX - rect2CenterX) < rect1ExtentX + rect2ExtentX)
		&& (Math.abs(rect1CenterY - rect2CenterY) < rect1ExtentY + rect2ExtentY);
}
