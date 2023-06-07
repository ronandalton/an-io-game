const QUAD_TREE_THRESHOLD = 4;
const QUAD_TREE_MAX_DEPTH = 3;


/**
 * Manages a collection of points on a 2D plane.
 * Each point is an object that must define x and y.
 * The position of an object must not be changed without
 * first removing and then reinserting it.
 */
class QuadTree {
	constructor(centerX, centerY, extentX, extentY, depth = 0) {
		this.centerX = centerX;
		this.centerY = centerY;
		this.extentX = extentX; // extentX * 2 = rectangle width
		this.extentY = extentY; // extentY * 2 = rectangle height
		this.depth = depth;
		this.isLeaf = true;
		this.objects = []; // null if !isLeaf
		this.children = null; // [] if !isLeaf
	}

	insert(object) {
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

	remove(object) {
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

	findObjectsInCenteredRect(rectCenterX, rectCenterY, rectExtentX, rectExtentY) {
		if (!centeredRectanglesIntersect(
				rectCenterX, rectCenterY, rectExtentX, rectExtentY,
				this.centerX, this.centerY, this.extentX, this.extentY)) {
			return [];
		}

		let objectsFound = [];

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
				const childNode = new QuadTree(
					this.centerX + signX * halfExtentX,
					this.centerY + signY * halfExtentY,
					halfExtentX, halfExtentY, this.depth + 1);
				this.children.push(childNode);
			}
		}

		for (const object of this.objects) {
			this.children[this._getQuadrantOfPoint(object.x, object.y)].insert(object);
		}

		this.objects = null;
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

	_mergeNode() {
		this.objects = [];
		
		for (const childNode of this.children) {
			this.objects = this.objects.concat(childNode.objects);
		}

		this.children = null;
		this.isLeaf = true;
	}

	_getQuadrantOfPoint(x, y) {
		return 2 * (y >= this.centerY) + (x >= this.centerX);
	}
}


function centeredRectangleContainsPoint(
		rectCenterX, rectCenterY, rectExtentX, rectExtentY, pointX, pointY) {
	return (Math.abs(pointX - rectCenterX) < rectExtentX)
		&& (Math.abs(pointY - rectCenterY) < rectExtentY);
}


function centeredRectanglesIntersect(
		rect1CenterX, rect1CenterY, rect1ExtentX, rect1ExtentY,
		rect2CenterX, rect2CenterY, rect2ExtentX, rect2ExtentY) {
	return (Math.abs(rect1CenterX - rect2CenterX) < rect1ExtentX + rect2ExtentX)
		&& (Math.abs(rect1CenterY - rect2CenterY) < rect1ExtentY + rect2ExtentY);
}


export {QuadTree};
