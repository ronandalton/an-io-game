import { CircularObject } from './CircularObject';
import { QuadTree } from './QuadTree'


/**
 * Manages a large collection of circular objects arranged in 2D space.
 * A circular object defines x, y, radius and id.
 * Each object must also provide a .clone() method that returns a copy of the object.
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
export class CircularObjectMap<T extends CircularObject> {
	private objects: Map<number, T>; // key: id
	private quadTree: QuadTree<T>;

	/**
	 * Constructs a new CircularObjectMap.
	 * The origin is the top left corner of the area to be covered by the map.
	 *
	 * @param originX The x position of the origin.
	 * @param originX The y position of the origin.
	 * @param width The width of map area.
	 * @param height The height of map area.
	 */
	constructor(originX: number, originY: number, width: number, height: number) {
		const centerX = originX + width / 2;
		const centerY = originY + height / 2;
		const extentX = width / 2;
		const extentY = height / 2;

		this.objects = new Map();
		this.quadTree = new QuadTree(centerX, centerY, extentX, extentY);
	}

	/**
	 * Adds the given object to the collection.
	 * If an object with the same id is already in the collection,
	 * it is updated to match the properties of the new object.
	 *
	 * @param object A circular object that defines x, y, radius and id.
	 */
	add(object: T) {
		this.remove(object.id);

		const objectCopy = object.clone();

		this.objects.set(object.id, objectCopy);
		this.quadTree.insert(objectCopy);
	}

	/**
	 * Removes the object with the given id from the collection.
	 * If the object cannot be found, nothing will be removed.
	 *
	 * @param id The id of the object to remove.
	 */
	remove(id: number) {
		const object = this.objects.get(id);
		if (object !== undefined) {
			this.quadTree.remove(object);
			this.objects.delete(id);
		}
	}

	/**
	 * Retrieves the object with the given id from the collection.
	 * 
	 * @param id This id of the object to get.
	 * @returns A copy of the object if found, otherwise null.
	 */
	get(id: number): T | null {
		return this.objects.get(id)?.clone() ?? null;
	}

	/**
	 * Retrieves all objects stored in the collection.
	 * 
	 * @returns A list of copies of all the objects stored in the collection.
	 */
	getAll(): T[] {
		return Array.from(this.objects.values()).map((object) => (object.clone()));
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
	findSmallerObjectsIntersecting(object: CircularObject): T[] {
		const objectsFound: T[] = [];

		const candidates: T[] = this.quadTree.findObjectsInCenteredRect(
			object.x, object.y, object.radius * 2, object.radius * 2);

		for (const candidate of candidates) {
			if (candidate.id !== object.id) {
				if (circlesIntersect(candidate.x, candidate.y, candidate.radius,
						object.x, object.y, object.radius)) {
					if (candidate.radius < object.radius || (candidate.radius === object.radius
							&& candidate.id < object.id)) {
						objectsFound.push(candidate.clone());
					}
				}
			}
		}

		return objectsFound;
	}
}


function circlesIntersect(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean {
	const dx = x1 - x2;
	const dy = y1 - y2;
	const distance = Math.sqrt(dx * dx + dy * dy);

	return distance < r1 + r2;
}
