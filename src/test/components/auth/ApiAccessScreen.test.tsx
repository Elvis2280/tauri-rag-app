import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { faker } from '@faker-js/faker';
import { describe, expect, it, vi } from 'vitest';
import ApiAccessScreen from '@/components/auth/ApiAccessScreen';

describe('ApiAccessScreen', () => {
  it('submits the entered credential to the native setup handler', async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const apiKey = faker.string.alphanumeric({ length: 32 });
    const onConfigure = vi.fn().mockResolvedValue(undefined);
    render(
      <ApiAccessScreen error={null} vaultError={null} onConfigure={onConfigure} />,
    );

    // 2. ACT
    await user.type(screen.getByLabelText('API key'), apiKey);
    await user.click(screen.getByRole('button', { name: 'Connect' }));

    // 3. ASSERT
    expect(onConfigure).toHaveBeenCalledWith(apiKey);
    expect(screen.getByLabelText('API key')).toHaveValue('');
  });

  it('shows validation feedback without invoking native setup for an empty key', async () => {
    // 1. ARRANGE
    const user = userEvent.setup();
    const onConfigure = vi.fn();
    render(
      <ApiAccessScreen error={null} vaultError={null} onConfigure={onConfigure} />,
    );

    // 2. ACT
    await user.click(screen.getByRole('button', { name: 'Connect' }));

    // 3. ASSERT
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the API key');
    expect(onConfigure).not.toHaveBeenCalled();
  });
});
