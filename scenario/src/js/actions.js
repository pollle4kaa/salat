// js/actions.js

function normalizeFoodName(name) {
    name = name.toLowerCase().trim();
    // Удаляем окончания: курицы -> куриц, но потом исправим особые случаи
    var lastChar = name.slice(-1);
    if ('ыиаяе'.indexOf(lastChar) !== -1) {
        name = name.slice(0, -1);
    }
    // Особые случаи
    if (name === 'яйц') name = 'яйцо';
    if (name === 'творог') return name; // уже норма
    if (name === 'творога') name = 'творог';
    if (name === 'гречк') name = 'гречка';
    if (name === 'банана') name = 'банан';
    if (name === 'куриц') name = 'курица';
    return name;
}

// ЗАМЕНИТЬ существующую функцию addFood
function addFood(foodName, amount, context) {
    var normalized = normalizeFoodName(foodName);
    addAction({
        action_id: "add_food",
        parameters: {
            productName: normalized,
            amount: amount
        }
    }, context);
}

function deleteLastFood(context) {
    addAction({
        action_id: "delete_last_food",
        parameters: {}
    }, context);
}

function addCustomFood(name, weight, calories, context) {
  addAction({ 
    action_id: "add_custom_food", 
    parameters: { productName: name, amount: weight, customCalories: calories } 
  }, context);
}


function searchRecipes(ingredients, context) {
  addAction({
    action_id: "search_recipes",
    parameters: { ingredients: ingredients || [] }
  }, context);
}

function addAction(action, context) {
  var command = { type: "smart_app_data", action: action };
  for (var i = 0; context.response.replies && i < context.response.replies.length; i++) {
    if (context.response.replies[i].type === "raw" && 
        context.response.replies[i].body && 
        context.response.replies[i].body.items) {
      context.response.replies[i].body.items.push({ command: command });
      return;
    }
  }
  reply({ items: [{ command: command }] }, context.response);
}

function deleteFoodById(foodId, context) {
    // Если фронтенд будет поддерживать удаление по ID, можно использовать это
    addAction({
        action_id: "delete_food_by_id",
        parameters: {
            id: foodId
        }
    }, context);
}

function getProgress(context) {
    addAction({
        action_id: "get_progress",
        parameters: {}
    }, context);
}

function getRecommendations(context) {
    addAction({
        action_id: "get_recommendations",
        parameters: {}
    }, context);
}