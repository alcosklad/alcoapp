/**
 * FIFO (First In First Out) логика для управления партиями товаров
 * Товары продаются в порядке поступления (самая старая партия первой)
 */

import pb from './pocketbase';

/**
 * Получить все партии товара в городе, отсортированные по дате (FIFO)
 * @param {string} productId - ID товара
 * @param {string} supplierId - ID города (supplier)
 * @returns {Promise<Array>} - Массив партий, отсортированных по reception_date (ASC)
 */
export async function getBatchesFIFO(productId, supplierId) {
  try {
    const batches = await pb.collection('stocks').getFullList({
      filter: `product = "${productId}" && supplier = "${supplierId}" && quantity > 0`,
      sort: '+reception_date,+created',
      expand: 'product,supplier,reception_id'
    });
    
    return batches;
  } catch (error) {
    console.error('Error fetching FIFO batches:', error);
    return [];
  }
}

/**
 * Продать товар по FIFO логике
 * @param {string} productId - ID товара
 * @param {string} supplierId - ID города
 * @param {number} quantityToSell - Количество для продажи
 * @returns {Promise<{success: boolean, soldItems: Array, error?: string}>}
 */
export async function sellProductFIFO(productId, supplierId, quantityToSell) {
  try {
    // Получаем партии по FIFO
    const batches = await getBatchesFIFO(productId, supplierId);
    
    if (batches.length === 0) {
      return {
        success: false,
        soldItems: [],
        error: 'Товар отсутствует в остатках'
      };
    }

    // Проверяем общее количество
    const totalAvailable = batches.reduce((sum, batch) => sum + (batch.quantity || 0), 0);
    
    if (totalAvailable < quantityToSell) {
      return {
        success: false,
        soldItems: [],
        error: `Недостаточно товара. Доступно: ${totalAvailable}, требуется: ${quantityToSell}`
      };
    }

    const soldItems = [];
    let remainingToSell = quantityToSell;

    // Проходим по партиям от самой старой к новой
    for (const batch of batches) {
      if (remainingToSell <= 0) break;

      const batchQuantity = batch.quantity || 0;
      const takeFromBatch = Math.min(batchQuantity, remainingToSell);
      
      // Записываем информацию о проданном товаре
      soldItems.push({
        productId: batch.product,
        productName: batch.expand?.product?.name || '',
        quantity: takeFromBatch,
        cost: batch.cost_per_unit || batch.cost || batch.expand?.product?.cost || 0,
        batchNumber: batch.batch_number || '',
        batchId: batch.id,
        receptionId: batch.reception_id || null,
        receptionDate: batch.reception_date || null
      });

      // Обновляем количество в партии
      const newQuantity = batchQuantity - takeFromBatch;
      
      if (newQuantity === 0) {
        // Удаляем партию если товар закончился
        await pb.collection('stocks').delete(batch.id);
      } else {
        // Уменьшаем количество
        await pb.collection('stocks').update(batch.id, {
          quantity: newQuantity
        });
      }

      remainingToSell -= takeFromBatch;
    }

    return {
      success: true,
      soldItems
    };
  } catch (error) {
    console.error('Error in sellProductFIFO:', error);
    return {
      success: false,
      soldItems: [],
      error: error.message || 'Ошибка при продаже товара'
    };
  }
}

/**
 * Вернуть товар обратно в партию (при возврате заказа)
 * @param {string} batchId - ID партии (если известен)
 * @param {string} productId - ID товара
 * @param {string} supplierId - ID города
 * @param {number} quantity - Количество для возврата
 * @param {number} cost - Себестоимость
 * @param {string} batchNumber - Номер партии
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function returnProductToBatch(batchId, productId, supplierId, quantity, cost, batchNumber) {
  try {
    // Пытаемся найти партию
    let batch = null;
    
    if (batchId) {
      batch = await pb.collection('stocks').getOne(batchId).catch(() => null);
    }
    
    // Если партия не найдена по ID, ищем по batch_number
    if (!batch && batchNumber) {
      batch = await pb.collection('stocks').getFirstListItem(
        `batch_number = "${batchNumber}" && product = "${productId}" && supplier = "${supplierId}"`
      ).catch(() => null);
    }

    if (batch) {
      // Партия существует - увеличиваем количество
      await pb.collection('stocks').update(batch.id, {
        quantity: (batch.quantity || 0) + quantity
      });
    } else {
      // Партия была удалена - создаем заново
      await pb.collection('stocks').create({
        product: productId,
        supplier: supplierId,
        quantity: quantity,
        cost: cost,
        cost_per_unit: cost,
        batch_number: batchNumber,
        reception_date: new Date().toISOString().split('T')[0]
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error returning product to batch:', error);
    return {
      success: false,
      error: error.message || 'Ошибка при возврате товара'
    };
  }
}

/**
 * Списать товар из партии
 * @param {string} batchId - ID партии
 * @param {number} quantity - Количество для списания
 * @param {Object} writeOffData - Данные для записи списания
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function writeOffFromBatch(batchId, quantity, writeOffData) {
  try {
    // Получаем партию
    const batch = await pb.collection('stocks').getOne(batchId, {
      expand: 'product,supplier'
    });

    if (!batch) {
      return {
        success: false,
        error: 'Партия не найдена'
      };
    }

    if (batch.quantity < quantity) {
      return {
        success: false,
        error: `Недостаточно товара в партии. Доступно: ${batch.quantity}`
      };
    }

    // Создаем запись списания
    await pb.collection('write_offs').create({
      product: batch.product,
      supplier: batch.supplier,
      quantity: quantity,
      cost: (batch.cost_per_unit || batch.cost || 0) * quantity,
      reason: writeOffData.reason,
      comment: writeOffData.comment || '',
      reception_id: batch.reception_id || null,
      reception_date: batch.reception_date || null,
      batch_number: batch.batch_number || '',
      user: writeOffData.userId,
      writeoff_date: new Date().toISOString()
    });

    // Уменьшаем количество в партии
    const newQuantity = batch.quantity - quantity;
    
    if (newQuantity === 0) {
      // Удаляем партию если товар закончился
      await pb.collection('stocks').delete(batchId);
    } else {
      // Уменьшаем количество
      await pb.collection('stocks').update(batchId, {
        quantity: newQuantity
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error writing off from batch:', error);
    return {
      success: false,
      error: error.message || 'Ошибка при списании товара'
    };
  }
}

/**
 * Получить историю партий товара (для отображения)
 * @param {string} productId - ID товара
 * @param {string} supplierId - ID города (опционально)
 * @returns {Promise<Array>} - Массив партий с деталями
 */
export async function getProductBatchHistory(productId, supplierId = null) {
  try {
    const filter = supplierId 
      ? `product = "${productId}" && supplier = "${supplierId}"`
      : `product = "${productId}"`;

    const batches = await pb.collection('stocks').getFullList({
      filter,
      sort: '+reception_date,+created',
      expand: 'product,supplier,reception_id'
    });

    return batches.map(batch => ({
      id: batch.id,
      batchNumber: batch.batch_number || '—',
      quantity: batch.quantity || 0,
      cost: batch.cost_per_unit || batch.cost || 0,
      receptionDate: batch.reception_date || batch.created,
      receptionId: batch.reception_id || null,
      supplier: batch.expand?.supplier?.name || '—',
      product: batch.expand?.product?.name || '—'
    }));
  } catch (error) {
    console.error('Error fetching batch history:', error);
    return [];
  }
}

/**
 * Рассчитать средневзвешенную себестоимость товара
 * @param {string} productId - ID товара
 * @param {string} supplierId - ID города
 * @returns {Promise<number>} - Средневзвешенная себестоимость
 */
export async function getWeightedAverageCost(productId, supplierId) {
  try {
    const batches = await getBatchesFIFO(productId, supplierId);
    
    if (batches.length === 0) return 0;

    let totalCost = 0;
    let totalQuantity = 0;

    batches.forEach(batch => {
      const quantity = batch.quantity || 0;
      const cost = batch.cost_per_unit || batch.cost || 0;
      totalCost += cost * quantity;
      totalQuantity += quantity;
    });

    return totalQuantity > 0 ? totalCost / totalQuantity : 0;
  } catch (error) {
    console.error('Error calculating weighted average cost:', error);
    return 0;
  }
}

/**
 * Проверить доступность товара для продажи
 * @param {string} productId - ID товара
 * @param {string} supplierId - ID города
 * @param {number} quantity - Требуемое количество
 * @returns {Promise<{available: boolean, totalStock: number}>}
 */
export async function checkProductAvailability(productId, supplierId, quantity) {
  try {
    const batches = await getBatchesFIFO(productId, supplierId);
    const totalStock = batches.reduce((sum, batch) => sum + (batch.quantity || 0), 0);
    
    return {
      available: totalStock >= quantity,
      totalStock
    };
  } catch (error) {
    console.error('Error checking product availability:', error);
    return {
      available: false,
      totalStock: 0
    };
  }
}
