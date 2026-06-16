import { Router } from 'express';
import { dbFunctions } from '../database.js';
import { requireAdmin, requireVisitor } from '../middleware.js';
import logger from '../logger.js';
import { jsonError, jsonInternalError } from '../errorHandler.js';
import { Err, Msg } from '../apiMessages.js';
import cache from '../cache.js';

const router = Router();

router.get('/', requireVisitor, (req, res) => {
  try {
    const cacheKey = 'groups';
    let groups = cache.get(cacheKey);

    if (!groups) {
      groups = dbFunctions.getAllGroups();
      cache.set(cacheKey, groups, 30000);
    }

    res.json(groups);
  } catch (error) {
    logger.error('Error in GET /api/groups:', { error: error.message });
    res.status(500).json(jsonInternalError(error));
  }
});

router.get('/:id', requireVisitor, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const group = dbFunctions.getGroupById(id);
    if (!group) {
      return res.status(404).json(jsonError(Err.groupNotFound));
    }
    res.json(group);
  } catch (error) {
    logger.error('Error in GET /api/groups/:id:', { error: error.message, groupId: id });
    res.status(500).json(jsonInternalError(error));
  }
});

router.post('/', requireAdmin, (req, res) => {
  try {
    const { name, color, displayOrder } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json(jsonError(Err.groupNameRequired));
    }

    const group = dbFunctions.addGroup({
      name: name.trim(),
      color: color || '#4a9eff',
      displayOrder: displayOrder || 0
    });

    cache.delete('groups');
    res.status(201).json(group);
  } catch (error) {
    logger.error('Error in POST /api/groups:', { error: error.message });
    res.status(500).json(jsonInternalError(error));
  }
});

router.put('/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, color, displayOrder } = req.body;

    const group = dbFunctions.getGroupById(id);
    if (!group) {
      return res.status(404).json(jsonError(Err.groupNotFound));
    }

    if (name && name.trim() === '') {
      return res.status(400).json(jsonError(Err.groupNameEmpty));
    }

    const updated = dbFunctions.updateGroup(id, {
      name: name !== undefined ? name.trim() : group.name,
      color: color !== undefined ? color : group.color,
      displayOrder: displayOrder !== undefined ? displayOrder : group.display_order
    });

    cache.delete('groups');
    res.json(updated);
  } catch (error) {
    logger.error('Error in PUT /api/groups/:id:', { error: error.message, groupId: id });
    res.status(500).json(jsonInternalError(error));
  }
});

router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const group = dbFunctions.getGroupById(id);
    if (!group) {
      return res.status(404).json(jsonError(Err.groupNotFound));
    }

    dbFunctions.deleteGroup(id);
    cache.delete('groups');
    res.json({ success: true, message: Msg.groupDeleted });
  } catch (error) {
    logger.error('Error in DELETE /api/groups/:id:', { error: error.message, groupId: id });
    res.status(500).json(jsonInternalError(error));
  }
});

export default router;
