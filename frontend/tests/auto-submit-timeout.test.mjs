import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

function parseSource(relativeUrl, scriptKind = ts.ScriptKind.TS) {
  const filePath = fileURLToPath(new URL(relativeUrl, import.meta.url));
  const sourceText = readFileSync(filePath, 'utf8');
  return ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, scriptKind);
}

function findVariableFunction(sourceFile, variableName) {
  let found = null;

  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(sourceFile) === variableName &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      found = node.initializer;
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return found;
}

function collectCallNames(node, sourceFile) {
  const calls = [];

  const visit = (child) => {
    if (ts.isCallExpression(child)) {
      const expression = child.expression;
      if (ts.isIdentifier(expression)) {
        calls.push(expression.text);
      }
      if (ts.isPropertyAccessExpression(expression)) {
        calls.push(expression.name.text);
        calls.push(expression.getText(sourceFile));
      }
    }

    ts.forEachChild(child, visit);
  };

  visit(node);
  return calls;
}

function findObjectMethod(sourceFile, objectName, methodName) {
  let found = null;

  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(sourceFile) === objectName &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      found = node.initializer.properties.find((property) => {
        const name = property.name?.getText(sourceFile);
        return name === methodName;
      }) ?? null;
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return found;
}

function findApiPostCall(node, sourceFile, urlFragment) {
  let found = null;

  const visit = (child) => {
    if (
      ts.isCallExpression(child) &&
      ts.isPropertyAccessExpression(child.expression) &&
      child.expression.getText(sourceFile) === 'api.post' &&
      child.arguments[0]?.getText(sourceFile).includes(urlFragment)
    ) {
      found = child;
      return;
    }

    ts.forEachChild(child, visit);
  };

  visit(node);
  return found;
}

test('time expiry uses the expire endpoint instead of normal submit', () => {
  const sourceFile = parseSource('../src/modules/student/pages/QuizAttemptPage.tsx', ts.ScriptKind.TSX);
  const handler = findVariableFunction(sourceFile, 'handleTimeExpired');

  assert.ok(handler, 'handleTimeExpired should exist');

  const callNames = collectCallNames(handler, sourceFile);
  assert.ok(
    callNames.includes('expireCurrentAttempt'),
    'handleTimeExpired should finalize with expireCurrentAttempt so the backend accepts timed-out attempts',
  );
  assert.ok(
    !callNames.includes('submitCurrentAttempt'),
    'handleTimeExpired must not call submitCurrentAttempt because /submit rejects after the time limit',
  );
});

test('expireAttempt posts selected answers to the backend expire route', () => {
  const sourceFile = parseSource('../src/modules/student/services/attemptService.ts');
  const expireAttempt = findObjectMethod(sourceFile, 'attemptService', 'expireAttempt');

  assert.ok(expireAttempt, 'attemptService.expireAttempt should exist');
  assert.ok('parameters' in expireAttempt, 'expireAttempt should be a method-like declaration');
  assert.equal(expireAttempt.parameters.length, 2, 'expireAttempt should accept attemptId and submit payload');

  const payloadParameterName = expireAttempt.parameters[1].name.getText(sourceFile);
  const postCall = findApiPostCall(expireAttempt, sourceFile, '/attempts/${attemptId}/expire');

  assert.ok(postCall, 'expireAttempt should POST to /attempts/${attemptId}/expire');
  assert.equal(
    postCall.arguments[1]?.getText(sourceFile),
    payloadParameterName,
    'expireAttempt should send the selected answers payload as the request body',
  );
});
