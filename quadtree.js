/**
 * Manages a large collection of circular objects arranged in 2D space.
 * A circular object defines x, y, radius and id.
 * An efficient procedure to retrieve objects intersecting a given object is provided.
 *
 * Note that objects cannot be modified while they are in the collection.
 * To update the properties of an object, it must be added again.
 * All objects stored in this collection are copies, so an object retrieved from
 * the collection will not compare equal to the object that was initially added.
 *
 * The position of objects should generally be within the map bounds. However, this
 * implementation should be able to handle points that aren't within the bounds or
 * right on the edge of the bounds.
 */
class CircularObjectMap {
	/**
	 * Constructs a new CircularObjectMap.
	 * The origin is the top left corner of the area to be covered by the map.
	 *
	 * @param originX The x position of the origin.
	 * @param originX The y position of the origin.
	 * @param width The width of map area.
	 * @param height The height of map area.
	 */
	constructor(originX, originY, width, height) {
		const centerX = originX + width / 2;
		const centerY = originY + height / 2;
		const extentX = width / 2;
		const extentY = height / 2;

		this._objects = new Map(); // key: id
		this._quadTree = new QuadTree(centerX, centerY, extentX, extentY);
	}
	
	/**
	 * Retrieves the object with the given id from the collection.
	 * 
	 * @param id This id of the object to get.
	 * @returns A copy of the object if found, otherwise null.
	 */
	get(id) {
		return structuredClone(this._objects.get(id) || null);
	}

	/**
	 * Adds the given object to the collection.
	 * If an object with the same id is already in the collection,
	 * it is updated to match the properties of the new object.
	 *
	 * @param object A circular object that defines x, y, radius and id.
	 */
	add(object) {
		this.remove(object.id);
		
		const objectCopy = structuredClone(object);
		
		this._objects.set(object.id, objectCopy);
		this._quadTree.insert(objectCopy);
	}

	/**
	 * Removes the object with the given id from the collection.
	 * If the object cannot be found, nothing will be removed.
	 *
	 * @param id The id of the object to remove.
	 */
	remove(id) {
		if (this._objects.has(id)) {
			this._quadTree.remove(this._objects.get(id));
			this._objects.delete(id);
		}
	}

	/**
	 * Finds all objects which intersect the given object and which are smaller than it.
	 * If the two objects are the same size, then the one with a smaller object ID is chosen.
	 * This ensures that looping over all objects to find intersections doesn't result in
	 * any object intersections being missed or counted twice.
	 *
	 * @param object A circular object that defines x, y, radius and id.
	 * This object doesn't have to be in the collection.
	 * @return A list of objects in the collection which intersect the given object.
	 */
	findSmallerObjectsIntersecting(object) {
		const objectsFound = [];

		const candidates = this._quadTree.findObjectsInCenteredRect(
			object.x, object.y, object.radius * 2, object.radius * 2);

		for (const candidate of candidates) {
			if (candidate.id !== object.id) {
				if (circlesIntersect(candidate.x, candidate.y, candidate.radius,
						object.x, object.y, object.radius)) {
					if (candidate.radius < object.radius || (candidate.radius === object.radius
							&& candidate.id < object.id)) {
						objectsFound.push(structuredClone(candidate));
					}
				}
			}
		}

		return objectsFound;
	}
}


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


function circlesIntersect(x1, y1, r1, x2, y2, r2) {
	const dx = x1 - x2;
	const dy = y1 - y2;
	const distance = Math.sqrt(dx * dx + dy * dy);

	return distance < r1 + r2;
}


export {CircularObjectMap};