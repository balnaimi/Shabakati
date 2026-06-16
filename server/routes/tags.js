import { Router } from 'express';
import { dbFunctions } from '../database.js';
import { requireAdmin, requireVisitor } from '../middleware.js';
import logger from '../logger.js';
import { asyncHandler, apiThrow, jsonError, jsonInternalError } from '../errorHandler.js';
import { validateTagName, validateColor } from '../validators.js';
import { Err, Msg } from '../apiMessages.js';
import cache from '../cache.js';

const router = Router();

router.get('/', requireVisitor, (req, res) => {
  try {
    const cacheKey = 'tags';
    let tags = cache.get(cacheKey);

    if (!tags) {
      tags = dbFunctions.getAllTags();
      cache.set(cacheKey, tags, 30000);
    }

    res.json(tags);
  } catch (error) {
    res.status(500).json(jsonInternalError(error));
  }
});

router.get('/:id', requireVisitor, (req, res) => {
  try {
    const tag = dbFunctions.getTagById(parseInt(req.params.id));
    if (!tag) {
      return res.status(404).json(jsonError(Err.tagNotFound));
    }
    res.json(tag);
  } catch (error) {
    res.status(500).json(jsonInternalError(error));
  }
});

router.post('/', requireAdmin, asyncHandler((req, res) => {
  const { name, color } = req.body;

  const nameValidation = validateTagName(name);
  if (!nameValidation.valid) {
    apiThrow(400, nameValidation.apiDef);
  }

  const colorValidation = validateColor(color || '#4a9eff');
  if (!colorValidation.valid) {
    apiThrow(400, colorValidation.apiDef);
  }

  const existingTag = dbFunctions.getTagByName(nameValidation.sanitized);
  if (existingTag) {
    apiThrow(400, Err.tagAlreadyExists);
  }

  const newTag = {
    name: nameValidation.sanitized,
    color: color || '#4a9eff',
    createdAt: new Date().toISOString()
  };

  const tag = dbFunctions.addTag(newTag);
  cache.delete('tags');
  logger.info('Tag added', { tagId: tag.id, name: tag.name });
  res.status(201).json(tag);
}));

router.put('/:id', requireAdmin, asyncHandler((req, res) => {
  const id = parseInt(req.params.id);
  const { name, color } = req.body;

  const nameValidation = validateTagName(name);
  if (!nameValidation.valid) {
    apiThrow(400, nameValidation.apiDef);
  }

  const colorValidation = validateColor(color || '#4a9eff');
  if (!colorValidation.valid) {
    apiThrow(400, colorValidation.apiDef);
  }

  const existingTag = dbFunctions.getTagById(id);
  if (!existingTag) {
    apiThrow(404, Err.tagNotFound);
  }

  const tagWithSameName = dbFunctions.getTagByName(nameValidation.sanitized);
  if (tagWithSameName && tagWithSameName.id !== id) {
    apiThrow(400, Err.tagAlreadyExists);
  }

  const updatedTag = dbFunctions.updateTag(id, {
    name: nameValidation.sanitized,
    color: color || '#4a9eff'
  });

  cache.delete('tags');
  logger.info('Tag updated', { tagId: id, name: updatedTag.name });
  res.json(updatedTag);
}));

router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = dbFunctions.deleteTag(id);

    if (result.changes === 0) {
      return res.status(404).json(jsonError(Err.tagNotFound));
    }

    cache.delete('tags');
    cache.delete('stats');
    res.json({ message: Msg.tagDeleted });
  } catch (error) {
    res.status(500).json(jsonInternalError(error));
  }
});

export default router;
