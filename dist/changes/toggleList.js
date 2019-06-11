'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slate = require('slate');

var _options = require('../options');

var _options2 = _interopRequireDefault(_options);

var _ = require('.');

var _utils = require('../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function isListOrItem(options, node) {
    return (0, _utils.isList)(options, node) || (0, _utils.isItem)(options, node);
}

function mapListDescendants(document) {
    return function (node) {
        return {
            depth: document.getDepth(node.key),
            node: node
        };
    };
}

function sortListDescendants(options, a, b) {
    if (a.depth !== b.depth) {
        return b.depth - a.depth;
    }

    if (a.node.type === b.node.type) {
        return 0;
    }

    if (a.node.type === options.typeItem) {
        return -1;
    }

    return 1;
}

function unwrapMappedNodes(change, mappedNode) {
    return change.withoutNormalizing(function () {
        change.unwrapBlockByKey(mappedNode.node.key, mappedNode.node.type);
    });
}

function findAncestorList(change, options, commonAncestor) {
    var _change$value = change.value,
        document = _change$value.document,
        selection = _change$value.selection;
    // This flag should be true, when elements are in selection

    var isInSelectionFlag = false;

    return commonAncestor.filterDescendants(function (node) {
        return isListOrItem(options, node);
    }).filter(function (node) {
        var hasStart = node.hasNode(selection.start.key);
        var hasEnd = node.hasNode(selection.end.key);
        var isListItem = (0, _utils.isItem)(options, node);

        if (hasStart && isListItem) isInSelectionFlag = true;
        if (hasEnd && isListItem) isInSelectionFlag = false;

        return isInSelectionFlag || hasStart || hasEnd;
    }).map(mapListDescendants(document)).sort(function () {
        for (var _len = arguments.length, params = Array(_len), _key = 0; _key < _len; _key++) {
            params[_key] = arguments[_key];
        }

        return sortListDescendants.apply(undefined, [options].concat(params));
    });
}

function isSameLevel(sortedMappedNodes) {
    if (!sortedMappedNodes.size) {
        return true;
    }

    var max = sortedMappedNodes.first().depth;
    var min = sortedMappedNodes.last().depth;

    return max === min;
}

/**
 * Toggle list on the selected range.
 */
function toggleList(options, change) {
    var _change$value2 = change.value,
        document = _change$value2.document,
        selection = _change$value2.selection;

    var startBlock = document.getClosestBlock(selection.start.key);
    var endBlock = document.getClosestBlock(selection.end.key);

    // -------- SINGLE BLOCK ---------------------------------------------------
    // The selection is in a single block.
    // Let's unwrap just the block, not the whole list.
    if (startBlock === endBlock) {
        return (0, _utils.isSelectionInList)(options, change.value) ? (0, _.unwrapList)(options, change) : (0, _.wrapInList)(options, change);
    }

    // -------- NOT A SINGLE BLOCK -------------------------------------------
    var commonAncestor = document.getCommonAncestor(startBlock.key, endBlock.key);

    var sortedMappedNodes = findAncestorList(change, options, commonAncestor);

    // There are no lists or items in selection => wrap them
    if (!sortedMappedNodes.size) {
        return (0, _.wrapInList)(options, change);
    }

    // All items are the same level => unwrap them
    if (isSameLevel(sortedMappedNodes)) {
        return (0, _.unwrapList)(options, change);
    }

    // Common Ancestor is not a list or item
    if (!isListOrItem(options, commonAncestor)) {
        var _newChange = sortedMappedNodes
        // @TODO last item is filtered, so it wouldn't break down flat whole list -> unwrapNodeByKey should be solution (problem with key)
        .filter(function (item) {
            return sortedMappedNodes.last().depth !== item.depth;
        }).reduce(unwrapMappedNodes, change);
        return _newChange;
    }

    // Unwrap all nested nodes
    var newChange = sortedMappedNodes.reduce(unwrapMappedNodes, change);

    // Unwrap common ancestor
    return (0, _.unwrapList)(options, newChange);
}

exports.default = toggleList;