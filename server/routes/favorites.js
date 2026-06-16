import { Router } from 'express';
import { dbFunctions } from '../database.js';
import { requireAdmin, requireVisitor } from '../middleware.js';
import logger from '../logger.js';
import { asyncHandler, apiThrow, jsonError, jsonInternalError } from '../errorHandler.js';
import { Err, Msg } from '../apiMessages.js';
import cache from '../cache.js';

const router = Router();

router.get('/', requireVisitor, (req, res) => {
  try {
    const cacheKey = 'favorites';
    let favorites = cache.get(cacheKey);

    if (!favorites) {
      favorites = dbFunctions.getAllFavorites();
      cache.set(cacheKey, favorites, 30000);
    }

    res.json(favorites);
  } catch (error) {
    logger.error('Error in GET /api/favorites:', { error: error.message });
    res.status(500).json(jsonInternalError(error));
  }
});

router.post('/bulk', requireAdmin, asyncHandler(async (req, res) => {
  const { hostIds, action } = req.body;
  if (!Array.isArray(hostIds) || hostIds.length === 0) {
    apiThrow(400, Err.hostIdsArrayRequired);
  }
  if (hostIds.length > 500) {
    apiThrow(400, Err.maxHostsPerRequest);
  }
  if (action !== 'add' && action !== 'remove') {
    apiThrow(400, Err.actionAddOrRemove);
  }

  const unique = [...new Set(hostIds.map((x) => parseInt(x, 10)).filter((n) => !Number.isNaN(n) && n > 0))];
  let affected = 0;
  let skipped = 0;

  for (const hid of unique) {
    const host = dbFunctions.getHostById(hid);
    if (!host) {
      skipped++;
      continue;
    }
    if (action === 'add') {
      if (dbFunctions.isHostFavorite(hid)) {
        skipped++;
        continue;
      }
      try {
        dbFunctions.addFavorite({ hostId: hid });
        affected++;
      } catch {
        skipped++;
      }
    } else {
      const r = dbFunctions.deleteFavoriteByHostId(hid);
      if (r.changes > 0) affected++;
      else skipped++;
    }
  }

  cache.delete('favorites');
  res.json({ affected, skipped, action });
}));

router.get('/:id', requireVisitor, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const favorite = dbFunctions.getFavoriteById(id);
    if (!favorite) {
      return res.status(404).json(jsonError(Err.favoriteNotFound));
    }
    res.json(favorite);
  } catch (error) {
    logger.error('Error in GET /api/favorites/:id:', { error: error.message, favoriteId: id });
    res.status(500).json(jsonInternalError(error));
  }
});

router.post('/', requireAdmin, (req, res) => {
  try {
    const { hostId, url, groupId, displayOrder, customName, description } = req.body;

    if (!hostId) {
      return res.status(400).json(jsonError(Err.hostIdRequired));
    }

    const host = dbFunctions.getHostById(hostId);
    if (!host) {
      return res.status(404).json(jsonError(Err.hostNotFound));
    }

    const favorite = dbFunctions.addFavorite({
      hostId: parseInt(hostId),
      url: url || null,
      groupId: groupId ? parseInt(groupId) : null,
      displayOrder: displayOrder || 0,
      customName: customName || null,
      description: description || null
    });

    cache.delete('favorites');
    res.status(201).json(favorite);
  } catch (error) {
    logger.error('Error in POST /api/favorites:', { error: error.message });
    res.status(500).json(jsonInternalError(error));
  }
});

router.put('/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { url, groupId, displayOrder, customName, description } = req.body;

    const favorite = dbFunctions.getFavoriteById(id);
    if (!favorite) {
      return res.status(404).json(jsonError(Err.favoriteNotFound));
    }

    const updated = dbFunctions.updateFavorite(id, {
      url: url !== undefined ? url : favorite.url,
      groupId: groupId !== undefined ? (groupId ? parseInt(groupId) : null) : favorite.groupId,
      displayOrder: displayOrder !== undefined ? displayOrder : favorite.displayOrder,
      customName: customName !== undefined ? customName : favorite.customName,
      description: description !== undefined ? description : favorite.description
    });

    cache.delete('favorites');
    res.json(updated);
  } catch (error) {
    logger.error('Error in PUT /api/favorites/:id:', { error: error.message, favoriteId: id });
    res.status(500).json(jsonInternalError(error));
  }
});

router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const favorite = dbFunctions.getFavoriteById(id);
    if (!favorite) {
      return res.status(404).json(jsonError(Err.favoriteNotFound));
    }

    dbFunctions.deleteFavorite(id);
    cache.delete('favorites');
    res.json({ success: true, message: Msg.favoriteRemoved });
  } catch (error) {
    logger.error('Error in DELETE /api/favorites/:id:', { error: error.message, favoriteId: id });
    res.status(500).json(jsonInternalError(error));
  }
});

export default router;
